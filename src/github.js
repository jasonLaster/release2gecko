const { exec, log, action, error } = require("./utils");
const shell = require("shelljs");

function makeBundle(config) {
  action(":computer: Making bundle");
  shell.cd(config.ghPath);
  const res = exec(`node bin/copy-assets.js --mc ../gecko --assets`);
  if (res.code != 0) {
    error("Failed to copy bundle");
    console.log(res.stderr);
    return { exit: true };
  }
}

module.exports = {
  makeBundle
};
