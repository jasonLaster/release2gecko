const { info, log } = require("./log");
const { exec } = require("../utils");
const chalk = require("chalk");
const shell = require("shelljs");
const inquirer = require("inquirer");

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

function getBranches() {
  const resp = exec(`git b --list`);
  return resp.stdout
    .split("\n")
    .map(line => line.replace(/\*/, "").trim())
    .filter(i => i);
}

async function deleteBranches(config) {
  const branches = getBranches();

  const response = await inquirer.prompt([
    {
      type: "checkbox",
      message: "Select branches",
      name: "branches",
      choices: [...branches.map(branch => ({ name: branch }))]
    }
  ]);

  const deadBranches = response.branches;
  const out = exec(`git branch -D ${deadBranches.join(" ")}`);
  log(out.stdout);
}

module.exports = {
  branchExists,
  hasChanges,
  showChanges,
  deleteBranches
};
