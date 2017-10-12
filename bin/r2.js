const inquirer = require("inquirer");

const { getConfig, updateConfig } = require("../src/config");
const cmds = require("../index");

const tasks = {
  "Create release": cmds.createRelease,
  "Update release": cmds.updateRelease,
  "View current bug": cmds.viewBug,
  "View current try run": cmds.viewTry,
  "Remove GH Branches": cmds.pruneGHBranches,
  "Remove MC Branches": cmds.pruneMCBranches
};

const taskCmd = {
  "-c": cmds.createRelease,
  "-u": cmds.updateRelease,
  "-b": cmds.viewBug,
  "-t": cmds.viewTry
};

function start() {
  if (process.argv.length === 3) {
    const task = process.argv[2];
    return taskCmd[task](config);
  }

  inquirer
    .prompt([
      {
        type: "list",
        name: "task",
        message: "Release 2 Gecko",
        choices: Object.keys(tasks)
      }
    ])
    .then(answers => tasks[answers.task](config));
}

let config = getConfig();
start();
