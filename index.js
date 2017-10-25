const inquirer = require("inquirer");
const path = require("path");
const shell = require("shelljs");

const { exec } = require("./src/utils");
const { log, format, info, action } = require("./src/utils/log");
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
  gecko.updateRepo(config);
  gecko.createBranch(config);

  github.makeBundle(config);
  gecko.showBranchChanges(config);

  await gecko.createBug(config);
  await gecko.createCommit(config);
  gecko.buildFirefox(config);

  const results = gecko.runDebuggerTests(config);

  // NOTE: headless mode has 5 known failutes
  if (results.match(/Failed: 5/)) {
    await gecko.tryRun(config);
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
      name: "runTests",
      message: "Run Tests?",
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

    gecko.updateRepo(config);
    gecko.checkoutBranch(config);
    gecko.rebaseBranch(config);
    gecko.showBranchChanges(config);
  } else {
    gecko.checkoutBranch(config);
  }

  if (prompts.updateBundle) {
    bumpVersion(config);

    github.makeBundle(config);
    gecko.showBranchChanges(config);
    gecko.updateCommit(config);
    gecko.buildFirefox(config);
  }

  if (prompts.updateBug) {
    let shouldPublish = true;
    if (prompts.runTests) {
      const results = gecko.runDebuggerTests(config);
      const fails = results.match(/Failed: (\d+)/)[1];
      const passes = results.match(/Passed: (\d+)/)[1];
      // NOTE: headless mode has 7 known failures
      shouldPublish = +fails <= 7 && +passes > 0;
    }

    if (shouldPublish) {
      await gecko.tryRun(config);
      await gecko.publishPatch(config);
    } else {
      log(results);
    }
  }
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
  await gecko.tryRun(config);
}

module.exports = {
  createRelease,
  bumpVersion,
  updateRelease,
  viewBug,
  viewTry,
  pruneMCBranches,
  pruneGHBranches,
  publishPatch
};
