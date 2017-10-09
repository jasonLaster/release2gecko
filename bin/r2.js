const inquirer = require("inquirer");

const { getConfig, updateConfig } = require("../src/config");
const { createRelease, updateRelease, viewBug, viewTry } = require("../index");

const tasks = {
  "create release": createRelease,
  "update release": updateRelease,
  "view current bug": viewBug,
  "view current try run": viewTry
};

const taskCmd = {
  "-c": createRelease,
  "-u": updateRelease,
  "-b": viewBug,
  "-t": viewTry
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
        choices: [
          "Create release",
          "Update release",
          "View current bug",
          "View current try run"
        ],
        filter: val => val.toLowerCase()
      }
    ])
    .then(answers => tasks[answers.task](config));
}

let config = getConfig();
start();
