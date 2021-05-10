const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHANGELOG_PATTERN = /^mysql\/changelog\/db.changelog-.*/;
const CHANGELOG_FILE_PATTERN = /^db.changelog-.*.mysql.sql/;

const logDebug = (message) => (process.env.debug ? console.debug(message) : null);

function getCommitId() {
  return execSync('git rev-parse HEAD').toString().trim();
}

function getBranchName() {
  const branchName = execSync('git branch --show-current').toString().trim();
  if (branchName.includes('/')) {
    return branchName.split('/')[1];
  }

  return branchName;
}

function getAllHistory(liquibaseBasePath, liquibaseConfPath, classPath, databaseToCompare) {
  return new Promise((resolve, reject) => {
    const historyData = new Set();

    const history = spawn(liquibaseBasePath, [
      `--url=${databaseToCompare}`,
      `--classpath=${classPath}`,
      `--defaultsFile=${liquibaseConfPath}`,
      `--username=${process.env.DB_USER}`,
      `--password=${process.env.DB_PASS}`,
      `--liquibaseHubApiKey=${process.env.API_KEY}`,
      `--hubProjectId=${process.env.PROJECT_ID}`,
      'history',
    ]);

    history.stdout.on('data', (data) => {
      logDebug(`stdout: ${data}`);
      logDebug('-- section --');
      data
        .toString()
        .split('\n')
        .forEach((line) => {
          if (line && line.toString() && line.toString().replace(/ /g, '').match(CHANGELOG_PATTERN)) {
            logDebug('Match:');
            logDebug(line);
            historyData.add(line.toString().replace(/ /g, '').split('::')[0]);
          }
        });
    });

    history.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      return reject(new Error(data));
    });

    history.on('close', (code) => {
      logDebug(`child process exited with code ${code}`);
      logDebug(historyData);
      // convert Set to Array
      return resolve({ code, historyData: [...historyData] });
    });
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
    throw new Error('No local file found');
  }

  if (!history || history.length === 0) {
    throw new Error('No history file found');
  }

  local.forEach((localFile) => {
    logDebug(`Comparing ${history} with ${localFile}`);
    if (!history.find((h) => h.includes(localFile))) {
      logDebug(`${localFile} has never been ran.`);
      warn.push(`${localFile} has never been ran.`);
      return;
    }
    logDebug(`'${localFile}' has been added.`);
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
};
