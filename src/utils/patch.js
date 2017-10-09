const path = require("path");
const fs = require("fs");

function getPatchName(config) {
  return `patch-${config.branch}-${config.version}.patch`;
}

function getPatchFilePath(config) {
  return path.join(__dirname, "../../patches", getPatchName(config));
}

function getPatchText(config) {
  return fs.readFileSync(getPatchFilePath(config)).toString();
}

module.exports = { getPatchText, getPatchName, getPatchFilePath };
