const bz = require("bz");
const fs = require("fs");
const path = require("path");
const api_key = fs.readFileSync(path.join(__dirname, "../api_key"), "utf8");
const { getPatchText, getPatchName } = require("./utils/patch");
let bugzilla;

async function login() {
  if (bugzilla) {
    return bugzilla;
  }

  bugzilla = bz.createClient({
    url: "https://api-dev.bugzilla.mozilla.org/rest/",
    api_key,
    timeout: 30000
  });

  return bugzilla;
}

async function getBug(config) {
  await login();
  return new Promise(r => {
    bugzilla.getBug(config.bugId, function(error, bug) {
      if (!error) {
        r(bug);
      } else {
        console.log(error);
      }
    });
  });
}

async function getAttachments(config) {
  await login();
  return new Promise(r => {
    bugzilla.bugAttachments(config.bugId, function(error, resp) {
      if (!error) {
        r(resp);
      } else {
        console.log(error);
      }
    });
  });
}

async function createBug(config, overrides) {
  await login();

  const bug = {
    summary: `Update Debugger Release (${config.branch})`,
    product: "Firefox",
    component: "Developer Tools: Debugger",
    version: "57 Branch",
    // comments: [
    //   // {
    //   //   text: "something",
    //   //   creator: user
    //   // }
    // ]
    ...overrides
  };

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

async function createAttachment(config) {
  const { bugId, reviewer } = config;

  const reviewerFlag = {
    name: "review",
    status: "?",
    requestee: reviewer,
    new: true
  };

  const patchText = getPatchText(config);
  const patchName = getPatchName(config);

  await login();
  return new Promise(resolve => {
    bugzilla.createAttachment(
      bugId,
      {
        ids: [bugId],
        is_patch: true,
        comment: "",
        summary: patchName,
        content_type: "text/plain",
        data: new Buffer(patchText).toString("base64"),
        file_name: patchName,
        obsolete: ["8918081"], // we'll need to add this
        is_private: false,
        flags: [reviewerFlag]
      },
      function(error, response) {
        console.log({ error, response });
        resolve(response);
      }
    );
  });
}

async function deleteAttachment(config) {
  const { bugId, reviewer } = config;

  await login();
  console.log(`deleting ${config.attachment}`);
  return new Promise(resolve => {
    bugzilla.updateAttachment(
      config.attachment,
      {
        ids: [config.attachment],
        is_obsolete: true
      },
      function(error, response) {
        console.log({ error, response });
        resolve(response);
      }
    );
  });
}

async function createComment(bugId, text) {
  await login();
  return new Promise(resolve => {
    bugzilla.addComment(bugId, { comment: text }, (e, r) => {
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
  deleteAttachment,
  createBug,
  login,
  uploadPatch,
  getBug,
  getAttachments
};
