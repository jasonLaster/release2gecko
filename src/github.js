const { exec } = require("./utils");
const { log, action, error, info } = require("./utils/log");
const { hasChanges, showChanges, branchHead } = require("./utils/git");
const shell = require("shelljs");

function makeBundle(config, { withAssets = true } = {}) {
  action(":computer: Making bundle");
  shell.cd(config.ghPath);

  if (hasChanges(config)) {
    info("Github changes:");
    showChanges(config);
  }

  const assets = withAssets ? `--assets` : "";

  const res = exec(`node bin/copy-assets.js --mc ../gecko ${assets}`);
  if (res.code != 0) {
    error("Failed to copy bundle");
    console.log(res.stderr);
    return { exit: true };
  }
}

function updateBranch(config) {
  exec(`git add .`);

  if (branchHead().includes("Update Release")) {
    exec(`git commit --amend --allow-empty --no-verify --no-edit`);
  } else {
    exec(`git commit -m \"Update Release (${config.branch})"`);
  }

  exec(`git push me ${config.branch} --force --no-verify`);
}

function createBranch(branch) {
  action(`:shovel: Creating Branch`);

  if (branchExists(branch)) {
    return exec(`git checkout ${branch}`);
  }

  exec(`git clean -fx && git reset --hard HEAD`);
  exec(`git checkout master`);
  exec(`git rpull`);
  exec(`git checkout -b ${branch}`);
}

module.exports = {
  makeBundle,
  updateBranch
};
