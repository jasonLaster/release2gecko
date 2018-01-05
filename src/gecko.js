const inquirer = require("inquirer");
const shell = require("shelljs");
const chalk = require("chalk");
const debug = require("debug")("S2G");
const fs = require("fs");
const path = require("path");

const {
  branchExists,
  hasChanges,
  showChanges,
  branchHead
} = require("./utils/git");
const { exec, replaceTilde } = require("./utils");
const { log, info, error, action } = require("./utils/log");
const { getPatchFilePath } = require("./utils/patch");
const { updateConfig } = require("./config");
const bugzilla = require("./bugzilla");

function clearChanges(config) {
  exec(`git clean -fx && git reset --hard HEAD`);
}

async function promptChanges() {
  const { nuke } = await inquirer.prompt([
    {
      type: "confirm",
      name: "nuke",
      message: "Clear changes?",
      default: true
    }
  ]);

  return nuke;
}

async function cleanupBranch(config) {
  shell.cd(config.mcPath);
  if (hasChanges(config)) {
    info(":question: Hmm, there are changes in mc.");
    showChanges();

    const nuke = await promptChanges();
    if (!nuke) {
      return { exit: true };
    }

    error(`:bomb: Nuking the local changes`);
    clearChanges();
  }

  return {};
}

function showBranchChanges(config) {
  shell.cd(config.mcPath);
  if (hasChanges(config)) {
    info(`Gecko changes:`);
    showChanges(config);
  }
}

function updateMC(config) {
  shell.cd(config.mcPath);

  action(`:goat: Fetching mozilla`);
  exec(`git fetch mozilla`);

  ["beta", "inbound", "central"].forEach(branch => {
    action(`:zap: Updating ${branch}`);
    exec(`git checkout bookmarks/${branch}`);
    exec(`git reset --hard mozilla/${branch};`);
  });
}

function updateBranch(config, branch = "central") {
  action(`:runner: Updating ${branch}!`);

  shell.cd(config.mcPath);
  exec(`git checkout bookmarks/${branch}`);
  exec(`git fetch mozilla`);
  exec(`git reset --hard mozilla/${branch};`);
}

function checkoutBranch(config) {
  info(`:ledger: Checking out branch ${config.branch}`);
  shell.cd(config.mcPath);
  return exec(`git checkout ${config.branch}`);
}

function rebaseBranch(config) {
  const branch = config.branch;
  shell.cd(config.mcPath);

  const hasPatch = isPatchOnHead();
  const head = exec(`git log HEAD -n1 --oneline`).stdout;
  const sha = head.match(/^(\w+)/)[1];

  action(`Resetting off of central`);
  exec(`git checkout ${config.branch}`);
  exec(`git reset --hard bookmarks/central;`);

  if (hasPatch) {
    action(`Cherry Picking ${head}`);
    exec(`git cherry-pick ${sha}`);
  }
}

function createBranch(config) {
  const date = new Date();
  const branch = `${date.getMonth() + 1}-${date.getDate()}`;
  shell.cd(config.mcPath);

  if (branchExists(branch)) {
    return checkoutBranch(config, branch);
  }

  updateConfig(config, { branch });
  info(`:ledger: To view Changes: git show ${branch}`);
  exec(`git checkout -b ${branch}`);
}

async function createBug(config) {
  const title = `Update Debugger Frontend (${config.branch})`;
  action(`Creating Bug: ${title}`);
  const bugId = await bugzilla.createBug(config, {
    summary: title,
    product: "Firefox",
    component: "Developer Tools: Debugger",
    version: "57 Branch",
    assigned_to: config.assignee
    // depends_on: {
    //   set: [1412334]
    // }
  });

  updateConfig(config, { bugId });
}

function fileExists(filePath) {
  const out = exec(`ls -l ${filePath}`);
  return out.stdout.trim() !== 0;
}

function buildFirefox(config) {
  action(":seedling: Building Firefox");
  shell.cd(config.mcPath);

  checkMozConfig(config);
  exec(`./mach clobber`);
  exec(`./mach build`);
}

function getReviewerName(email) {
  return email.match(/^(.*)\@.*/)[1];
}

function commitMsg(config) {
  const reviewerName = getReviewerName(config.reviewer);
  return `Bug ${config.bugId} - Update Debugger frontend (${
    config.branch
  }). r=${reviewerName}`;
}

function createCommit(config) {
  action(":dizzy: Creating commit");
  shell.cd(config.mcPath);

  const msg = commitMsg(config);
  exec(`git add .`);
  exec(`git commit -m "${msg}"`);
}

function isPatchOnHead(filePath = "") {
  return branchHead(filePath).match(/Update Debugger/);
}

function checkForBullies() {
  const paths = [
    "devtools/client/preferences/debugger.js",
    "devtools/client/locales/en-US/debugger.properties",
    "devtools/client/debugger/new"
  ];

  let bully = false;
  for (filePath of paths) {
    if (!isPatchOnHead(filePath)) {
      error(`Uh oh, looks like there was a recent change: ${filePath}`);
      bully = true;
    }
  }

  if (bully) {
    return { exit: true };
  }

  return {};
}

function updateCommit(config) {
  shell.cd(config.mcPath);
  action("Updating commit");

  const patchBranch = `${config.branch}-${config.version}`;

  if (!isPatchOnHead()) {
    info("The patch commit is missing. Creating a new commit.");
    return createCommit(config);
  }

  action(":dizzy: Updating commit");
  exec(`git add .`);
  exec(`git commit -m "Patch ${config.version}"`);

  info(`:book: View changes: git show ${patchBranch}`);
  exec(`git checkout -b ${patchBranch}`);
  exec(`git checkout ${config.branch}`);

  exec(`git reset --soft HEAD~2`);
  const msg = commitMsg(config);
  exec(`git commit -m "${msg}"`);
}

async function publishPatch(config) {
  shell.cd(config.mcPath);

  const patchPath = getPatchFilePath(config);

  exec(`
    FILE=${patchPath}
    git hgp > $FILE
    less -m -N -g -i -J --underline-special --SILENT $FILE
  `);

  const attachments = await bugzilla.getAttachments(config);
  const attachmentIds = attachments.map(attachment => attachment.id);
  for (attachmentId of attachmentIds) {
    action(`Deleting attachment ${attachmentId}`);
    await bugzilla.deleteAttachment(attachmentId);
  }

  action(`:point_up_2: Uploading patch to ${config.branch}`);

  try {
    await bugzilla.createAttachment(config);
  } catch (e) {}
}

function checkMozConfig(config) {
  const mozconfig = `
    # Automatically download and use compiled C++ components:
    ac_add_options --enable-artifact-builds
    mk_add_options MOZ_OBJDIR=./objdir-frontend
    # ac_add_options --enable-optimize
  `
    .split("\n")
    .map(l => l.trim())
    .join("\n");

  const mozconfigPath = path.join(replaceTilde(config.mcPath), "mozconfig");

  shell.cd(config.mcPath);
  if (fs.existsSync(mozconfigPath)) {
    return;
  }

  action(`Creating mozconfig at ${mozconfigPath}`);
  fs.writeFileSync(mozconfigPath, mozconfig);
}

const consoleTests = [
  "jsterm_autocomplete_in_debugger_stackframe",
  "webconsole_click_function_to_source",
  "webconsole_closure_inspection",
  "webconsole_eval_in_debugger_stackframe",
  "webconsole_eval_in_debugger_stackframe2",
  "webconsole_optimized_out_vars",
  "webconsole_variables_view_while_debugging_and_inspecting",
  "webconsole_variables_view_while_debugging"
];

function getTestPaths() {
  return "devtools/client/debugger/new";
  // return ["devtools/client/debugger/new"].concat(consoleTests).join(" ");
}

function runDebuggerTests(config) {
  shell.cd(config.mcPath);
  checkMozConfig(config);

  action(":runner: Running debugger tests");

  const paths = getTestPaths();
  const headless = "--setenv MOZ_HEADLESS=1";
  const out = exec(`./mach mochitest ${headless} ${paths}`);

  if (out.stdout) {
    const match = out.stdout.match(/(Browser Chrome Test Summary(.|\n)*)/);
    if (match) {
      log(match[0]);
      return match[0];
    } else {
      log(out.stdout);
      return out.stdout;
    }
  }

  // log(out);

  const fails = +out.match(/Failed: (\d*)/)[1];
  const passes = +out.match(/Passed: (\d*)/)[1];
  const passed = +fails <= 7 && +passes > 0;
  return passed;
}

const mochitestRuns = {
  repeats: `./mach try -b do -p linux64,macosx64,win32,win64 -u mochitest-clipboard-e10s,mochitest-e10s-dt -t none --rebuild 10 devtools/client/debugger/new`,
  debugger: `./mach try  -b do -p linux64 -u mochitest-dt,mochitest-e10s-devtools-chrome,mochitest-o -t none`,
  devtools: `./mach try -b o -p linux64 -u mochitests -t none --artifact`
};

async function tryRun(config, mochitest, { uploadRun = true }) {
  const out = exec(mochitestRuns[mochitest]);
  const output = out.stdout.concat(out.stderr);
  const match = output.match(/(http.*treeherder.*)/);

  if (match) {
    const tryRun = match[0];
    console.log(`[${mochitest}](${tryRun})`);

    if (uploadRun) {
      await bugzilla.createComment(config.bugId, tryRun);
    }
  } else {
    log(output);
    return false;
  }
}

async function startTryRuns(config, options) {
  action(":cactus: Creating try run");

  shell.cd(config.mcPath);

  let out;

  if (true) {
    await tryRun(config, "repeats", options);
  }

  if (true) {
    await tryRun(config, "debugger", options);
  }

  if (false) {
    await tryRun(config, "devtools", options);
  }
}

module.exports = {
  commitMsg,
  cleanupBranch,
  showBranchChanges,
  rebaseBranch,
  updateBranch,
  updateMC,
  buildFirefox,
  createBranch,
  createBug,
  createCommit,
  updateCommit,
  checkoutBranch,
  publishPatch,
  runDebuggerTests,
  startTryRuns,
  checkMozConfig,
  checkForBullies
};
