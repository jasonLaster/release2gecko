const inquirer = require("inquirer");
const shell = require("shelljs");
const chalk = require("chalk");

const { branchExists, hasChanges, showChanges } = require("./utils/git");
const { exec } = require("./utils");
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
  info(":question: Checking for changes...");

  shell.cd(config.mcPath);
  if (hasChanges(config)) {
    info(":question: Hmm, there are changes.");
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

function updateRepo(config) {
  action(":runner: Updating Central!");

  shell.cd(config.mcPath);
  exec(`git checkout bookmarks/central`);
  exec(`git fetch mozilla`);
  exec(`git rebase mozilla/central`);
}

function checkoutBranch(config) {
  const branch = config.branch;
  info(`:ledger: Checking out branch ${branch}`);
  return exec(`git checkout ${branch}`);
}

function rebaseBranch(config) {
  const branch = config.branch;
  return exec(`git rebase bookmarks/central`);
}

function createBranch(config) {
  const date = new Date();
  const branch = `${date.getMonth() + 1}-${date.getDate()}`;

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

  if (!fileExists("mozconfig")) {
    error("Uhoh, the mozconfig does not exist.");
    return { exit: true };
  }

  const res = exec(`./mach clobber && ./mach build`);
  if (res.code !== 0) {
    info(`STDOUT`);
    log(res.stdout);
    info(`STDERR`);
    log(res.stderr);
  }
}

function getReviewerName(email) {
  return email.match(/^(.*)\@.*/)[1];
}

function commitMsg(config) {
  const reviewerName = getReviewerName(config.reviewer);
  return `Bug ${config.bugId} - Update Debugger frontend (${config.branch}). r=${reviewerName}`;
}

function createCommit(config) {
  action(":dizzy: Creating commit");
  shell.cd(config.mcPath);
  const msg = commitMsg(config);
  exec(`git add .`);
  exec(`git commit -m "${msg}"`);
}

function updateCommit(config) {
  action(":dizzy: Updating commit");
  shell.cd(config.mcPath);
  exec(`git add .`);

  // 1. create new patch branch
  // 2. commit the changes
  // 3. rebase the changes
  // 4. squash the commits
  const patchBranch = `${config.branch}-${config.version}`;

  exec(`git add .`);
  exec(`git commit -m "Patch ${config.version}"`);

  info(`:book: View changes at branch ${patchBranch}`);
  exec(`git checkout -b ${patchBranch}`);
  exec(`git checkout ${config.branch}`);

  exec(`git reset --soft HEAD~2`);
  const msg = commitMsg(config);
  exec(`git commit -m "${msg}"`);
}

async function makePatch(config) {
  shell.cd(config.mcPath);

  const patchPath = getPatchFilePath(config);

  exec(`
    FILE=${patchPath}
    git hgp > $FILE
    less -m -N -g -i -J --underline-special --SILENT $FILE
  `);

  action("Uploading patch");

  const attachments = await bugzilla.getAttachments(config);
  const attachmentIds = attachments.map(attachment => attachment.id);
  for (attachmentId of attachmentIds) {
    action(`Deleting attachment ${attachmentId}`);
    await bugzilla.deleteAttachment(attachmentId);
  }
  const { id } = await bugzilla.createAttachment(config);

  updateConfig(config, { attachment: id });
}

function runDebuggerTests(config) {
  action(":runner: Running debugger tests");

  shell.cd(config.mcPath);
  const out = exec(
    `./mach mochitest --setenv MOZ_HEADLESS=1 devtools/client/debugger/new`
  );

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
  return out;
}

async function tryRun(config) {
  action(":cactus: Creating a try run");

  shell.cd(config.mcPath);

  let out;

  if (true) {
    out = exec(
      `./mach try  -b do -p linux64 -u mochitest-dt,mochitest-e10s-devtools-chrome,mochitest-o -t none --artifact`
    );
  } else {
    // if we need to run a broader test...
    out = exec(`./mach try -b o -p linux64 -u mochitests -t none`);
  }

  const match = out.stdout.concat(out.stderr).match(/(http.*treeherder.*)/);
  if (match) {
    const tryRun = match[0];
    updateConfig(config, { try: tryRun });

    info(`> ${tryRun}`);
    await bugzilla.createComment(config.bugId, tryRun);
  } else {
    log(out);
  }
}

module.exports = {
  commitMsg,
  cleanupBranch,
  showBranchChanges,
  rebaseBranch,
  updateRepo,
  buildFirefox,
  createBranch,
  createBug,
  createCommit,
  updateCommit,
  checkoutBranch,
  makePatch,
  runDebuggerTests,
  tryRun
};
