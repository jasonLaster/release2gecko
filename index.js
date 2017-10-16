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
    await gecko.makePatch(config);
  }
}

function bumpVersion(config) {
  const version = config.version + 1;
  action(`:computer: Setting patch version to ${version}`);
  updateConfig(config, { version });
}

async function updateRelease(config, options) {
  if (false && options.shouldFetch) {
    const { exit } = await gecko.cleanupBranch(config);
    if (exit) {
      return info("wave", "Exiting!");
    }

    gecko.updateRepo(config);
    gecko.checkoutBranch(config);
    gecko.rebaseBranch(config);
  }

  github.makeBundle(config);
  gecko.showBranchChanges(config);

  bumpVersion(config);
  await gecko.updateCommit(config);

  gecko.buildFirefox(config);
  const results = gecko.runDebuggerTests(config);

  // NOTE: headless mode has 5 known failures
  if (results.match(/Failed: 5/)) {
    await gecko.tryRun(config);
    await gecko.makePatch(config);
  } else {
    log(results);
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

module.exports = {
  createRelease,
  bumpVersion,
  updateRelease,
  viewBug,
  viewTry,
  pruneMCBranches,
  pruneGHBranches
};
