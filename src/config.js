const { replaceTilde, replaceHomeDir } = require("./utils");
const fs = require("fs");
const path = require("path");

let configPath = "../r2gecko.json";

function getConfig() {
  const config = require(configPath);
  const newConfig = {
    ...config,
    mcPath: replaceTilde(config.mcPath),
    ghPath: replaceTilde(config.ghPath)
  };

  return newConfig;
}

function updateConfig(config, updates) {
  updates = updates || {};
  const newConfig = {
    ...config,
    ...updates,
    mcPath: replaceHomeDir(config.mcPath),
    ghPath: replaceHomeDir(config.ghPath)
  };

  Object.assign(config, newConfig);
  fs.writeFileSync(
    path.join(__dirname, configPath),
    JSON.stringify(newConfig, null, 2)
  );
}

module.exports = {
  getConfig,
  updateConfig
};
