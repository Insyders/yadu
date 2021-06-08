const { execSync } = require('child_process');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');

const CHANGELOG_PATTERN = /^mysql\/changelog\/db.changelog-.*/;
const CHANGELOG_FILE_PATTERN = /^db.changelog-.*.mysql.sql/;

const logDebug = (message) => (process.env.debug ? console.debug(message) : null);

function getCommitId() {
  return execSync('git rev-parse HEAD').toString().trim();
}

function getBranchName() {
  const branchName = process.env.AWS_BRANCH_NAME || execSync('git branch --show-current').toString().trim();
  branchName.replace(/\//g, '_');
  logDebug(branchName);

  return branchName;
}

function processHistory(content) {
  const historyData = new Set();

  content
    .toString()
    .split('\n')
    .forEach((line) => {
      if (line && line.toString() && line.toString().replace(/ /g, '').match(CHANGELOG_PATTERN)) {
        logDebug('Match:');
        logDebug(line);
        historyData.add(line.toString().replace(/ /g, '').split('::')[0]);
      }
    });

  return historyData;
}

function getAllHistory(liquibaseBasePath, liquibaseConfPath, classPath, databaseToCompare) {
  return new Promise((resolve, reject) => {
    const { code, stderr, stdout } = shell.exec(
      `${liquibaseBasePath} \
        --url='${databaseToCompare}' \
        --classpath=${classPath} \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        history`,
      { silent: !process.env.debug },
    );

    if (code && code !== 0) {
      return reject(new Error(stderr || stdout.replace(/#.*\n/gm, '')));
    }

    logDebug(stdout);
    const historyData = processHistory(stdout);

    // convert Set to Array
    return resolve({ code, historyData: [...historyData] });
  });
}

function getLocalMigration(basePath) {
  const directories = fs.readdirSync(path.resolve(basePath)).filter((dir) => dir.match(CHANGELOG_FILE_PATTERN));
  logDebug(directories);
  return directories;
}

function compare(local, history) {
  const valid = [];
  const warn = [];

  if (!local || local.length === 0) {
    throw new Error('No local files found to compare with the history');
  }

  if (!history || history.length === 0) {
    throw new Error('No history file found to compare with the local files');
  }

  local.forEach((localFile) => {
    logDebug(`Comparing ${history} with ${localFile}`);
    if (!history.find((h) => h.includes(localFile))) {
      logDebug(`${localFile} has never been deployed, it will not be included in the main file`);
      warn.push(`${localFile} has never been deployed, it will not be included in the main file`);
      return;
    }
    logDebug(`'${localFile}' has been added to the main file.`);
    valid.push(localFile);
  });

  logDebug({
    valid,
    warn,
    count: valid.length,
  });

  return {
    valid,
    warn,
    count: valid.length,
  };
}

module.exports = {
  getAllHistory,
  getLocalMigration,
  compare,
  logDebug,
  getCommitId,
  getBranchName,
  processHistory,
};
