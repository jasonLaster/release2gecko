const { info, log } = require("./log");
const { exec } = require("../utils");
const chalk = require("chalk");

function branchExists(branch) {
  const out = exec(`git rev-parse --verify ${branch}`, { silent: true });
  return out.code === 0;
}

function hasChanges() {
  const res = exec(`git status -s`);
  return res.stdout.trim().length !== 0;
}

function showChanges(config) {
  const diff = exec(`git diff --stat`).stdout.replace(
    /\| (\d+) ([+]*)([-]*)/g,
    `| $1 ${chalk.green("$2")}${chalk.red("$3")}`
  );

  log(diff);
}

module.exports = {
  branchExists,
  hasChanges,
  showChanges
};
