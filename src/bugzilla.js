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

async function createBug(config, bug) {
  await login();

  return new Promise(resolve => {
    bugzilla.createBug(bug, (error, response) => {
      if (error) {
        console.log({ error });
      }

      resolve(response);
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
        obsolete: [], // we'll need to add this
        is_private: false,
        flags: [reviewerFlag]
      },
      function(error, response) {
        if (error) {
          console.log("oops");
          reject(error);
        }
        resolve(response);
      }
    );
  });
}

async function deleteAttachment(id) {
  await login();
  return new Promise(resolve => {
    bugzilla.updateAttachment(
      id,
      {
        ids: [id],
        is_obsolete: true
      },
      function(error, response) {
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
  getBug,
  getAttachments
};
