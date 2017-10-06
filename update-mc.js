const shell = require("shelljs");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const emoji = require("node-emoji");


function exec(cmd) {
  const out = shell.exec(cmd, {silent: true})
  return out.stdout
}

function log(symbol, color, msg) {
  const emo = emoji.get(`:${symbol}:`);
  console.log(`${emo} ${chalk[color](msg)}`)

}

function hasChanges() {
  const out = exec(`git status -s`)
  return out.trim().length !== 0;
}

function clearChanges() {
  const out = exec(`git clean -fx && git reset --hard HEAD`)
}

function cleanupMc() {
  log(`question`, "yellow", "Checking for changes...")

  shell.cd(mcPath)
  if (hasChanges()) {
    log(`question`, "yellow", "Hmm, there are changes.")
    log(`bomb`, "red", "Nuking the local changes")
    clearChanges();
  }
}

function updateCentral() {
  log("runner", "blue", "Updating Central!")

  shell.cd(mcPath)
  exec(`git checkout bookmarks/central`);
  exec(`git fetch mozilla`);
  exec(`git rebase mozilla/central`);
}

function createBranch() {
  const date = new Date();
  const branch = `${date.getMonth()+1}-${date.getDay()+1}`

  log("ledger", "blue", `Creating branch ${branch}`)

  const out = shell.exec(`git rev-parse --verify ${branch}`, {silent: true})
  const exists = out.code === 0

  if (exists) {
    return exec(`git checkout ${branch}`)
  }

  exec(`git checkout -b ${branch}`)
}

function makeBundle() {
  log('computer', 'blue', 'Making bundle')
  shell.cd(ghPath)
  exec(`node bin/copy-assets.js --mc ../gecko --assets`)
}


function buildFirefox() {
  log('seedling', 'blue', 'Building Firefox')
  shell.cd(mcPath)
  exec(`./mach clobber; ./mach build`)
}

function createBug() {
  // https://www.npmjs.com/package/bz
  // https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Bug

  var bugzilla = bz.createClient({
    url: "https://api-dev.bugzilla.mozilla.org/rest/",
    username: 'bugs@bugmail.com',
    password: 'secret',
    timeout: 30000
  });

  bugzilla.createBug(bug, callback)

}

const mcPath = path.join(__dirname, "../gecko")
const ghPath = path.join(__dirname, "../debugger.html")

cleanupMc();
updateCentral();
createBranch();
makeBundle();
buildFirefox();

// runs the mochitests locally
// opens firefox ...
// creates the bug
// runs try

/*
  1. don't clobber if you don't need to
  2. don't cleanup MC unless you need to
    - if we have a release branch...
    - or the last commit is ours...



*/
