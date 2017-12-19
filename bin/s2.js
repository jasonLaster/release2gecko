#!/usr/bin/env node

const inquirer = require("inquirer");

const { getConfig, updateConfig } = require("../src/config");
const cmds = require("../index");

const tasks = {
  "Create release": cmds.createRelease,
  "Update release": cmds.updateRelease,
  "Start try runs": cmds.tryRuns,
  "View current bug": cmds.viewBug,
  "View current try run": cmds.viewTry,
  "Remove GH Branches": cmds.pruneGHBranches,
  "Remove MC Branches": cmds.pruneMCBranches,
  "Publish Patch": cmds.publishPatch
};

const taskCmd = {
  "-c": cmds.createRelease,
  "-u": cmds.updateRelease,
  "-t": cmds.tryRuns,
  "-p": cmds.publishPatch,
  "-b": cmds.viewBug,
  "-v": cmds.viewTry
};

function start() {
  if (process.argv.length > 2) {
    const task = process.argv[2];
    const params = process.argv.slice(3);
    try {
      return taskCmd[task](config, params);
    } catch (e) {
      console.error(e);
    }
  }

  inquirer
    .prompt([
      {
        type: "list",
        name: "task",
        message: "Ship 2 MC",
        choices: Object.keys(tasks)
      }
    ])
    .then(answers => {
      try {
        tasks[answers.task](config);
      } catch (e) {
        console.error(e);
      }
    });
}

let config = getConfig();
start();

process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at:", p, "reason:", reason);
  throw reason;
});
