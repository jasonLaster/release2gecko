const shell = require("shelljs");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const emoji = require("node-emoji");
const os = require("os");

function exec(cmd) {
  const out = shell.exec(cmd, { silent: true });
  return out;
}

function log(msg, color) {
  console.log(format(msg, color));
}

function info(msg) {
  console.log(format(msg, "yellow"));
}

function error(msg) {
  console.log(format(msg, "red"));
}

function action(msg) {
  console.log(format(msg, "blue"));
}

function findEmojis(str) {
  return str.replace(/(:.*?:)/g, x => `${emoji.get(x)} `);
}

function format(msg, color) {
  msg = findEmojis(msg);
  if (!color) {
    return msg;
  }

  return chalk[color](msg);
}

function replaceTilde(str) {
  return str.replace(/~/, os.homedir());
}

function replaceHomeDir(str) {
  return str.replace(new RegExp(os.homedir()), "~");
}

module.exports = {
  exec,
  log,
  info,
  error,
  action,
  format,
  replaceTilde,
  replaceHomeDir
};
