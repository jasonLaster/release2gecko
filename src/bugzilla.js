const bz = require("bz");
const fs = require("fs");
const path = require("path");
const api_key = fs.readFileSync(path.join(__dirname, "../api_key"), "utf8");
const { getPatchText, getPatchName } = require("./utils/patch");
let bugzilla;

async function login() {
  bugzilla = bz.createClient({
    url: "https://api-dev.bugzilla.mozilla.org/rest/",
    api_key,
    timeout: 30000
  });

  return bugzilla;
}

async function getBug(id) {
  return new Promise(r => {
    bugzilla.getBug(id, function(error, bug) {
      if (!error) {
        r(bug);
      } else {
        console.log(error);
      }
    });
  });
}

async function createBug(bug) {
  return new Promise(resolve => {
    bugzilla.createBug(bug, (e, r) => {
      if (e) {
        console.log(e);
      }

      console.log(r);
      return r;
    });
  });
}

var bug = {
  summary: "test bug",
  product: "Firefox",
  component: "Developer Tools: Debugger",
  version: "57 Branch"
  // comments: [
  //   // {
  //   //   text: "something",
  //   //   creator: user
  //   // }
  // ]
};

async function createAttachment(
  bugId,
  { text, reviewer, patchName },
  overrides = {}
) {
  const reviewerFlag = {
    name: "review",
    status: "?",
    requestee: reviewer,
    new: true
  };
  return new Promise(resolve => {
    bugzilla.createAttachment(
      bugId,
      {
        ids: [bugId],
        is_patch: true,
        comment: "",
        summary: "",
        content_type: "text/plain",
        data: new Buffer(text).toString("base64"),
        file_name: patchName,
        obsoletes: [], // we'll need to add this
        is_private: false,
        flags: [reviewerFlag],
        ...overrides
      },
      function(error, response) {
        resolve(response);
      }
    );
  });
}

async function createComment(bugId, text) {
  return new Promise(resolve => {
    bugzilla.createComment(bugId, { comment: text }, (e, r) => {
      resolve(r);
    });
  });
}

async function getAttachment() {
  // bugzilla.getAttachment(8916318, function(err, attachment) {
  //   // if (err) throw err;
  //   // assert.ok(attachment.bug_id);
  //   // done();
  //   console.log(attachment);
  // });
}

async function uploadPatch(config) {
  bugzilla = await login();
  const text = getPatchText(config);
  const patchName = getPatchName(config);
  console.log(patchName);
  return createAttachment(config.bug, {
    text,
    reviewer: config.reviewer,
    patchName
  });
}

// https://bugzilla.readthedocs.io/en/5.0/api/core/v1/attachment.html
// async function main() {
//   bugzilla = await login();
//
//   const attachment = await createAttachment(
//     1406697,
//     "(Some base64 encoded content)"
//   );
//   console.log(attachment);
//   // const r = await createBug(bug);
//
//   // const bug = await getBug(678223);
//   // console.log(bug.summary);
// }
//
// main();

module.exports = {
  createAttachment,
  createComment,
  createBug,
  login,
  uploadPatch
};
