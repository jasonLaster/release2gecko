const { exec, info, log } = require("../utils");
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
  if (!hasChanges(config)) {
    info(":blue_book: Nothing changed");
    return;
  }

  info("Gecko changes");

  const out = exec(`git diff --stat`).stdout.replace(
    /\| (\d+) ([+]*)([-]*)/g,
    `| $1 ${chalk.green("$2")}${chalk.red("$3")}`
  );

  log(out);
}

module.exports = {
  branchExists,
  hasChanges,
  showChanges
};
