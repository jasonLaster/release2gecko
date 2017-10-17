const shell = require("shelljs");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const emoji = require("node-emoji");
const os = require("os");
const debug = require("debug")("S2G");

function exec(cmd) {
  debug(cmd);
  const out = shell.exec(cmd, { silent: true });
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
