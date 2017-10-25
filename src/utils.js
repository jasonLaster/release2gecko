const shell = require("shelljs");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const emoji = require("node-emoji");
const os = require("os");
const debug = require("debug")("S2G");
const { error } = require("./utils/log");

function exec(cmd) {
  const out = shell.exec(cmd, { silent: true });
  debug({
    cmd,
    stdout: out.stdout.slice(0, 100),
    stderr: out.stderr.slice(0, 100)
  });

  if (out.code !== 0) {
    error(`Uhoh, ${cmd} failed!`);
    console.log(out.stderr);
  }

  return out;
}

function replaceTilde(str) {
  return str.replace(/~/, os.homedir());
}

function replaceHomeDir(str) {
  return str.replace(new RegExp(os.homedir()), "~");
}

module.exports = {
  exec,
  replaceTilde,
  replaceHomeDir
};
