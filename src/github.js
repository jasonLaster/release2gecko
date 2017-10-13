const { exec } = require("./utils");
const { log, action, error, info } = require("./utils/log");
const { hasChanges, showChanges } = require("./utils/git");
const shell = require("shelljs");
//
// async function commitChanges() {
//   const { nuke } = await inquirer.prompt([
//     {
//       type: "confirm",
//       name: "nuke",
//       message: "Exit?",
//       default: true
//     }
//   ]);
//
//   return nuke;
// }

function makeBundle(config) {
  action(":computer: Making bundle");
  shell.cd(config.ghPath);

  if (hasChanges(config)) {
    info("Github changes:");
    showChanges(config);
  }

  const res = exec(`node bin/copy-assets.js --mc ../gecko --assets`);
  if (res.code != 0) {
    error("Failed to copy bundle");
    console.log(res.stderr);
    return { exit: true };
  }

  exec(`git add .`);
  exec(`git commit -m \"Update Release (${config.version})\"`);
  exec(`git push me ${config.branch}`);
}

function createBranch(branch) {
  action(`:shovel: Creating Branch`);

  if (branchExists(branch)) {
    exec(`git checkout ${branch}`);
  }

  exec(`git clean -fx && git reset --hard HEAD`);
  exec(`git checkout master`);
  exec(`git rpull`);

  exec();
}

module.exports = {
  makeBundle
};
