const inquirer = require("inquirer");
const shell = require("shelljs");
const chalk = require("chalk");

const { exec, log, info, error } = require("./utils");
const { getPatchFilePath } = require("./utils/patch");

function hasChanges(config) {
  shell.cd(config.mcPath);

  const res = exec(`git status -s`);
  return res.stdout.trim().length !== 0;
}

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
  if (hasChanges()) {
    info(":question: Hmm, there are changes.");

    console.log(exec(`git diff --stat`));

    const nuke = await promptChanges();
    if (!nuke) {
      return { exit: true };
    }

    error(`:bomb: Nuking the local changes`);
    clearChanges();
  }

  return {};
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

function createBranch(config) {
  const date = new Date();
  const branch = `${date.getMonth() + 1}-${date.getDate()}`;

  const out = exec(`git rev-parse --verify ${branch}`, { silent: true });
  const exists = out.code === 0;

  if (exists) {
    return checkoutBranch(config, branch);
  }

  updateConfig(config, { branch });
  info(`:ledger: Creating branch ${branch}`);
  exec(`git checkout -b ${branch}`);
}

function buildFirefox(config) {
  log(":seedling: Building Firefox");
  shell.cd(config.mcPath);
  exec(`./mach clobber; ./mach build`);
}

function showChanges(config) {
  shell.cd(config.mcPath);

  info(":question: Gecko changes");
  const out = exec(`git diff --stat`).replace(
    /\| (\d+) ([+]*)([-]*)/g,
    `| $1 ${chalk.green("$2")}${chalk.red("$3")}`
  );

  console.log(out.stdout);
}

function createCommit(config) {
  log(":dizzy: Creating commit");
  shell.cd(config.mcPath);
  const msg = `Bug ${config.bugId} - Update Debugger frontend (${config.branch}). r=${config.reviewer}`;

  showChanges();
  exec(`git add .`);
  exec(`git commit -m "${msg}"`);
}

function updateCommit(config) {
  log(":dizzy: Updating commit");
  shell.cd(config.mcPath);
  exec(`git add .`);
  exec(`git commit --amend --no-edit -n`);
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

module.exports = {
  cleanupMc,
  hasChanges,
  showChanges,
  updateCentral,
  buildFirefox,
  createBranch,
  createCommit,
  updateCommit,
  checkoutBranch,
  makePatch
};
