const inquirer = require("inquirer");
const shell = require("shelljs");
const chalk = require("chalk");

const { branchExists, hasChanges, showChanges } = require("./utils/git");
const { exec } = require("./utils");
const { log, info, error, action } = require("./utils/log");
const { getPatchFilePath } = require("./utils/patch");
const { updateConfig } = require("./config");

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

async function cleanupMc(config) {
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

function showGeckoChanges(config) {
  shell.cd(config.mcPath);
  if (hasChanges(config)) {
    info(`Gecko changes:`);
    showChanges(config);
  }
}

function updateCentral(config) {
  log(":runner: Updating Central!");

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
  info(`:ledger: Creating branch ${branch}`);
  exec(`git checkout -b ${branch}`);
}

function fileExists(filePath) {
  const out = exec(`ls -l ${filePath}`);
  return out.stdout.trim() !== 0;
}

function buildFirefox(config) {
  log(":seedling: Building Firefox");
  shell.cd(config.mcPath);

  if (!fileExists("mozconfig")) {
    error("Uhoh, the mozconfig does not exist.");
    return { exit: true };
  }

  exec(`./mach clobber; ./mach build`);
}

function commitMsg(config) {
  return `Bug ${config.bugId} - Update Debugger frontend (${config.branch}). r=${config.reviewer}`;
}

function createCommit(config) {
  log(":dizzy: Creating commit");
  shell.cd(config.mcPath);
  const msg = commitMsg(config);
  exec(`git add .`);
  exec(`git commit -m "${msg}"`);
}

function updateCommit(config) {
  log(":dizzy: Updating commit");
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

function makePatch(config) {
  shell.cd(config.mcPath);
  const patchPath = getPatchFilePath(config);

  exec(`
    FILE=${patchPath}
    git hgp > $FILE
    less -m -N -g -i -J --underline-special --SILENT $FILE
  `);
}

function runDebuggerTests(config) {
  log(":runner: Running debugger tests");

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

  log(out);
  return out;
}

function tryRun(config) {
  action(":cactus: Creating a try run");

  shell.cd(config.mcPath);

  const out = exec(
    `./mach try  -b do -p linux -u mochitest-dt,mochitest-e10s-devtools-chrome,mochitest-o -t none`
  );

  const match = out.stdout.concat(out.stderr).match(/(http.*treeherder.*)/);
  if (match) {
    const tryRun = match[0];
    info(`> ${tryRun}`);
    updateConfig(config, { try: tryRun });
  } else {
    log(out);
  }
}

module.exports = {
  cleanupMc,
  hasChanges,
  showGeckoChanges,
  rebaseBranch,
  updateCentral,
  buildFirefox,
  createBranch,
  createCommit,
  updateCommit,
  checkoutBranch,
  makePatch,
  runDebuggerTests,
  tryRun
};
