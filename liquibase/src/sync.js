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
  shell.cd(basePath);
  logDebug(`Current Directory: ${basePath}`);
  const lastCommitId = getCommitId().substring(0, 8);
  const branchName = getBranchName();

  // Build the base Command
  let cmd = `${liquibaseBasePath} \
  --changeLogFile=${main} \
  --url='${process.env.DB_URL}' \
  --classpath=${classPath} \
  --defaultsFile '${liquibaseConfPath}' \
  --username='${process.env.DB_USER}' \
  --password='${process.env.DB_PASS}'`;

  if (process.env.API_KEY && process.env.API_KEY !== '') {
    cmd += ` --liquibaseHubApiKey='${process.env.API_KEY}'`;
  }
  if (process.env.PROJECT_ID && process.env.PROJECT_ID !== '') {
    cmd += ` --hubProjectId='${process.env.PROJECT_ID}'`;
  }

  // DEBUGGING
  if (process.env.MANUAL) {
    console.debug('[MANUAL] - ONLY PRINTS LIQUIBASE COMMANDS'.info);
    console.debug(`${cmd} \
    updateSQL`);
    console.debug(`${cmd} \
    registerChangeLog`);
    console.debug(`${cmd} \
    update`);
    console.debug(`${cmd} \
    tag ${branchName}-${lastCommitId}`);

    return;
  }

  if (dryrun === true) {
    console.log(`DRY-RUN: Using NODE_ENV: '${process.env.NODE_ENV}' with this changelog : '${main}'`.debug);
    const { code, stderr, stdout } = shell.exec(
      `${cmd} \
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

  let response = null;

  // 1. register to cloud hub
  if (process.env.API_KEY && process.env.API_KEY !== '' && process.env.PROJECT_ID && process.env.PROJECT_ID !== '') {
    console.log('[ACTION] Registering changelog'.action);
    response = shell.exec(
      `${cmd} \
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
  }

  // 2. update the targetted database
  console.log('[ACTION] Updating the database schema'.action);
  const updateCmd = `${cmd} \
    update`;

  logDebug(updateCmd);
  response = shell.exec(updateCmd, { silent: process.env.DEBUG === 'false' });

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  // 3. tag the changesets to enable the rollback functionnality
  console.log(`[ACTION] Tagging the changelog with '${branchName}-${lastCommitId}'`.action);
  response = shell.exec(
    `${cmd} \
    tag ${branchName}-${lastCommitId}`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  console.log(`${'[SUCCESS]'.success} Migrations deployed to '${process.env.NODE_ENV || process.env.DB_NAME}' successfully`);
}

module.exports = {
  sync,
};
