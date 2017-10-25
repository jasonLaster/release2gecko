### :ship: Ship 2 Gecko (S2G)

![screen]

[screen]:https://user-images.githubusercontent.com/254562/31301037-32391c9c-aac5-11e7-9d22-83381cebf3c6.png

Ship 2 Gecko is a set of tools that make it easier to develop in Github and land patches in Gecko.

1. Preparing gecko for a patch
2. Creating bugzilla issues, patches, and try runs
3. Viewing open release bugs and try runs

**Tasks**

*  Create release
*  Update release
*  View current bug
*  View current try run
*  Remove GH Branches
*  Remove MC Branches


### Getting Started

At some point, the [tool][s2g] will be good enough so that you can `npm i -g ship2gecko`
and call `s2` directly. That day is not today :)

1. `git clone https://github.com/jasonLaster/ship2gecko.git`
2. `cd ship2gecko; yarn`
3. `npm link`

You should be able to now call `s2` globally, and then modify the source
directly in `ship2gecko`.

---

### Creating a Release

```js
const { exit } = await gecko.cleanupBranch(config);
if (exit) {
  return info("wave", "Exiting!");
}

updateConfig(config, { version: 1 });
gecko.updateRepo(config);
gecko.createBranch(config);

github.makeBundle(config);
gecko.showBranchChanges(config);

await gecko.createBug(config);
await gecko.createCommit(config);
gecko.buildFirefox(config);

const results = gecko.runDebuggerTests(config);

// NOTE: headless mode has 5 known failutes
if (results.match(/Failed: 5/)) {
  await gecko.tryRun(config);
  await gecko.publishPatch(config);
}
```

### Updating a Release

```js
if (false && options.shouldFetch) {
  const { exit } = await gecko.cleanupBranch(config);
  if (exit) {
    return info("wave", "Exiting!");
  }

  gecko.updateRepo(config);
  gecko.checkoutBranch(config);
  gecko.rebaseBranch(config);
}

github.makeBundle(config);
gecko.showBranchChanges(config);

bumpVersion(config);
await gecko.updateCommit(config);

gecko.buildFirefox(config);
const results = gecko.runDebuggerTests(config);

// NOTE: headless mode has 5 known failures
if (results.match(/Failed: 5/)) {
  await gecko.tryRun(config);
  await gecko.publishPatch(config);
} else {
  log(results);
}
```

### Gecko

The Gecko module exposes several useful commands, which can be re-purposed
for other workflows. We can always make the commands more granular as well.

*  createBranch
*  cleanupBranch
*  showBranchChanges
*  checkoutBranch
*  rebaseBranch
*  updateRepo
*  createBug
*  publishPatch
*  createCommit
*  updateCommit
*  buildFirefox
*  runDebuggerTests
*  tryRun

### Bugzilla

There are several useful helpers based off of the bugzilla rest [api].

*  createAttachment
*  createComment
*  deleteAttachment
*  createBug
*  getBug
*  getAttachments

[api]: https://bugzilla.readthedocs.io/en/5.0/api/core/v1/attachment.html

### Config

The config is a small JSON file used for keeping

* **configuration**: such as the paths to MC and Github.
* **state**: like the current bug, branch, and version
* **preferences**: assignee and reviewer

```json
{
  "mcPath": "~/src/mozilla/gecko",
  "ghPath": "~/src/mozilla/debugger.html",
  "bugId": 1408601,
  "branch": "10-13",
  "reviewer": "jdescottes@mozilla.com",
  "assignee": "jlaster@mozilla.com",
  "version": 1,
  "try":
    "https://treeherder.mozilla.org/#/jobs?repo=try&revision=5073d499d082803f7ae7678bbcdb59be79a76b30"
}
```

[s2g]:https://github.com/jasonLaster/ship2gecko.git
