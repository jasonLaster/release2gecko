const inquirer = require("inquirer");
const path = require("path");
const shell = require("shelljs");

const { exec } = require("./src/utils");
const { log, format, info, action } = require("./src/utils/log");
const { popHead } = require("./src/utils/git");
const opn = require("opn");
const gecko = require("./src/gecko");

const github = require("./src/github");
const bugzilla = require("./src/bugzilla");
const git = require("./src/utils/git");

const { getConfig, updateConfig } = require("./src/config");

async function createRelease(config) {
  const { exit } = await gecko.cleanupBranch(config);
  if (exit) {
    return info("wave", "Exiting!");
  }

  updateConfig(config, { version: 1 });
  gecko.updateBranch(config);
  gecko.createBranch(config);
  github.makeBundle(config);
  github.updateBranch(config);
  gecko.showBranchChanges(config);

  await gecko.createBug(config);
  await gecko.createCommit(config);
  gecko.buildFirefox(config);

  const passed = gecko.runDebuggerTests(config);

  // NOTE: headless mode has 5 known failutes
  if (passed) {
    await gecko.startTryRuns(config, { uploadRun: true });
    await gecko.publishPatch(config);
  }
}

function bumpVersion(config) {
  const version = config.version + 1;
  action(`:computer: Setting patch version to ${version}`);
  updateConfig(config, { version });
}

async function updateWizard() {
  return inquirer.prompt([
    {
      type: "confirm",
      name: "resetMC",
      message: "Reset MC?",
      default: false
    },
    {
      type: "confirm",
      name: "updateBundle",
      message: "Update Bundle?",
      default: true
    },
    {
      type: "confirm",
      name: "updateBug",
      message: "Update Bug?",
      default: true
    },
    {
      type: "confirm",
      name: "checkBullies",
      message: "Check for MC Changes?",
      default: true
    },
    {
      type: "confirm",
      name: "runTests",
      message: "Run Tests?",
      default: true
    },
    {
      type: "confirm",
      name: "tryRuns",
      message: "Create Try Runs?",
      default: true
    }
  ]);
}

async function updateRelease(config, options) {
  const prompts = await updateWizard();
  if (prompts.resetMC) {
    const { exit } = await gecko.cleanupBranch(config);
    if (exit) {
      return info("wave", "Exiting!");
    }

    gecko.updateBranch(config);
    gecko.checkoutBranch(config);
    gecko.rebaseBranch(config);
    gecko.showBranchChanges(config);
  } else {
    gecko.checkoutBranch(config);
  }

  if (prompts.updateBundle) {
    bumpVersion(config);

    github.makeBundle(config);
    github.updateBranch(config);
    gecko.showBranchChanges(config);
    if (!prompts.checkBullies) {
      const { exit } = gecko.checkForBullies(config);
      if (exit) {
        return info("wave", "Exiting!");
      }
    }

    gecko.updateCommit(config);
  }

  let testsPass = true;
  if (prompts.runTests) {
    gecko.buildFirefox(config);
    testsPass = gecko.runDebuggerTests(config);
  }

  if (prompts.tryRuns) {
    await gecko.startTryRuns(config, { uploadRun: true });
  }

  if (prompts.updateBug && testsPass) {
    await gecko.publishPatch(config);
  }

  if (!prompts.runTests) {
    gecko.buildFirefox(config);
  }
}

async function tryRuns(config, options) {
  gecko.createBranch(config);
  github.makeBundle(config, { withAssets: true });

  if (false) {
    gecko.buildFirefox(config);
    testsPass = gecko.runDebuggerTests(config);
    if (!testsPass) {
      info("Tests failed");
      return;
    }
  }

  gecko.updateCommit(config);
  popHead();

  await gecko.startTryRuns(config, { uploadRun: false });
}

function updateMC(config) {
  gecko.updateMC(config);
}

function viewBug(config) {
  const url = `https://bugzilla.mozilla.org/show_bug.cgi?id=${config.bugId}`;
  opn(url);
  process.exit(0);
}

function viewTry(config) {
  opn(config.try);
  process.exit(0);
}

function pruneGHBranches(config) {
  shell.cd(config.ghPath);
  git.deleteBranches();
}

function pruneMCBranches(config) {
  shell.cd(config.mcPath);
  git.deleteBranches();
}

async function publishPatch(config, params) {
  const bugId = params[0];
  if (!bugId) {
    return error("Bug must be set");
  }
  config.bugId = bugId;
  await gecko.publishPatch(config);
  await gecko.startTryRuns(config, { uploadRun: true });
}

module.exports = {
  createRelease,
  bumpVersion,
  updateRelease,
  updateMC,
  tryRuns,
  viewBug,
  viewTry,
  pruneMCBranches,
  pruneGHBranches,
  publishPatch
};
