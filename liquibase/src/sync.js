const path = require('path');
const colors = require('colors');
const shell = require('shelljs');
const { getCommitId, getBranchName } = require('./utils');
const { logDebug } = require('../../globals/utils');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

function sync(liquibaseBasePath, liquibaseConfPath, basePath, classPath, dryrun, main = 'db.changelog-main.xml') {
  if (dryrun === true) {
    console.log(`DRY-RUN: Using NODE_ENV: '${process.env.NODE_ENV}' with this changelog : '${main}'`.debug);
    const { code, stderr, stdout } = shell.exec(
      `${liquibaseBasePath} \
        --changeLogFile='${path.join(basePath) + main}' \
        --url='${process.env.DB_URL}' \
        --classpath=${classPath} \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        updateSQL`,
      { silent: process.env.DEBUG === 'false' },
    );

    if (code && code !== 0) {
      throw new Error(stderr || stdout.replace(/#.*\n/gm, ''));
    }
    console.log(stdout);
    console.log('DRY-RUN : Nothing deployed.'.success);
    console.log("To execute the changesets. Run the same command with '--no-dry-run'".action);
    return;
  }

  const lastCommitId = getCommitId().substring(0, 8);
  const branchName = getBranchName();
  let response = null;

  // 1. register to cloud hub
  console.log('Registering changelog'.action);
  response = shell.exec(
    `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath) + main}' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    registerChangeLog`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);
    if (response.stderr.includes('is already registered') || response.stdout.includes('is already registered')) {
      logDebug('It is safe to continue');
      console.log('WARN: Changelog already registred.'.warn);
    } else if (
      response.stderr.includes("'hubProjectId' has invalid value 'undefined'") ||
      response.stdout.includes("'hubProjectId' has invalid value 'undefined'")
    ) {
      logDebug('It is safe to continue');
      console.log('WARN: Liquibase hub not configured.'.warn);
    } else {
      throw new Error(response.stderr || response.stdout);
    }
  }

  // 2. update the targetted database
  console.log('Updating the database schema'.action);
  const updateCmd = `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath) + main}' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    update`;

  logDebug(updateCmd);
  response = shell.exec(updateCmd, { silent: process.env.DEBUG === 'false' });

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  // 3. tag the changesets to enable the rollback functionnality
  console.log(`Tagging the changelog with '${branchName}-${lastCommitId}'`.action);
  response = shell.exec(
    `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath) + main}' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    tag ${branchName}-${lastCommitId}`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  console.log(`${'[SUCCESS]'.success}Migrations deployed to '${process.env.NODE_ENV || process.env.DB_NAME}' successfully`);
}

module.exports = {
  sync,
};
