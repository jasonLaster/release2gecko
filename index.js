const path = require("path");
const { exec, log, format, info, action } = require("./src/utils");
const opn = require("opn");
const {
  cleanupMc,
  hasChanges,
  showChanges,
  updateCentral,
  createBranch,
  buildFirefox,
  createCommit,
  updateCommit,
  checkoutBranch,
  makePatch
} = require("./src/gecko");

const { makeBundle } = require("./src/github");

const { createBug, uploadPatch } = require("./src/bugzilla");
const { getConfig, updateConfig } = require("./src/config");
//
// const config = {
//   mcPath: ,
//   ghPath: path.normalize()
// };

async function createRelease(config) {
  const { exit } = await cleanupMc(config);
  if (exit) {
    return info("wave", "Exiting!");
  }

  updateConfig(config, { version: 1 });
  // updateCentral(config);
  createBranch(config);
  makeBundle(config);
  createCommit(config);
  buildFirefox(config);
}

function bumpVersion(config) {
  const version = config.version + 1;
  action(`:computer: Setting patch version to ${version}`);
  updateConfig(config, { version });
}

async function updateRelease(config) {
  // checkoutBranch(config);
  //
  // makeBundle(config);
  //
  // if (!hasChanges(config)) {
  //   info(":blue_book: Nothing changed");
  //   return;
  // }
  //
  // bumpVersion(config);
  // showChanges(config);
  //
  // updateCommit(config);

  // buildFirefox(config);
  // run tests
  // open firefox
  // and prompt to proceed
  // makePatch(config);
  await uploadPatch(config);
  // start try run
}

function viewBug(config) {
  const url = `https://bugzilla.mozilla.org/show_bug.cgi?id=${config.bugId}`;
  opn(url);
  process.exit(0);
}

function viewTry(config) {}

module.exports = {
  createRelease,
  bumpVersion,
  updateRelease,
  viewBug,
  viewTry
};
