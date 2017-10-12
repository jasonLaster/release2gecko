const path = require("path");
const { exec } = require("./src/utils");
const { log, format, info, action } = require("./src/utils/log");
const opn = require("opn");
const gecko = require("./src/gecko");

const github = require("./src/github");

const { createBug, uploadPatch } = require("./src/bugzilla");
const { getConfig, updateConfig } = require("./src/config");
//
// const config = {
//   mcPath: ,
//   ghPath: path.normalize()
// };

async function createRelease(config) {
  const { exit } = await gecko.cleanupMc(config);
  if (exit) {
    return info("wave", "Exiting!");
  }

  updateConfig(config, { version: 1 });
  gecko.updateCentral(config);
  gecko.createBranch(config);
  github.makeBundle(config);
  gecko.createCommit(config);

  gecko.buildFirefox(config);

  const results = gecko.runDebuggerTests(config);

  // NOTE: headless mode has 5 known failutes
  if (results.match(/Failed: 5/)) {
    gecko.tryRun(config);
  }
}

function bumpVersion(config) {
  const version = config.version + 1;
  action(`:computer: Setting patch version to ${version}`);
  updateConfig(config, { version });
}

async function updateRelease(config, options) {
  if (false && options.shouldFetch) {
    const { exit } = await gecko.cleanupMc(config);
    if (exit) {
      return info("wave", "Exiting!");
    }

    gecko.updateCentral(config);
    gecko.checkoutBranch(config);
    gecko.rebaseBranch(config);
  }

  github.makeBundle(config);

  gecko.showChanges(config);

  bumpVersion(config);
  gecko.updateCommit(config);
  gecko.makePatch(config);
  gecko.buildFirefox(config);
  // const results = gecko.runDebuggerTests(config);
  //
  // // NOTE: headless mode has 5 known failutes
  // if (results.match(/Failed: 5/)) {
  //   gecko.tryRun(config);
  // }

  // open firefox
  // and prompt to proceed
  // makePatch(config);
  // await uploadPatch(config);
  // start try run
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

module.exports = {
  createRelease,
  bumpVersion,
  updateRelease,
  viewBug,
  viewTry
};
