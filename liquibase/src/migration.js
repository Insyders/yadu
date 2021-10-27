const { userInfo } = require('os');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const shell = require('shelljs');
const { getCommitId, getBranchName } = require('./utils');
const { logDebug, logVerbose } = require('../../libs/globals/utils');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

function createMigration(name, basePath) {
  const author = userInfo().username;
  const timestamp = new Date().getTime();
  // Force naming to be lowercase
  name = name.toLowerCase();

  const migrationPath = path.resolve(basePath, `db.changelog-${name}.mysql.sql`);

  console.log(`Will create a changelog named : '${migrationPath}' and the author name is '${author}'`.action);

  const lines = `-- liquibase formatted sql

-- changeset ${author}:${timestamp}-[create|update|insert|etc.]-[tableName]-[extraInfo]
-- comment [Put a human readable description]
[RAW SQL GOES HERE]
-- rollback [RAW SQL THAT ROLLBACKS THE SQL]

`;
  fs.writeFileSync(migrationPath, lines, { encoding: 'utf-8' });

  console.log(`File created at '${migrationPath}'`.success);
}

function deployMigration(name, environment = 'custom', liquibaseBasePath, liquibaseConfPath, basePath, classPath, dryrun) {
  // Must use the relative path approach.
  shell.cd(basePath);
  logDebug(`Current Directory: ${basePath}`);
  // Force name to be lowercase
  name = name.toLowerCase();
  const lastCommitId = getCommitId().substring(0, 8);
  const branchName = getBranchName();

  // Build the base Command
  let cmd = `${liquibaseBasePath} \
  --changeLogFile='./db.changelog-${name}.mysql.sql' \
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
    console.log(`[DRY-RUN] Using '${environment}' environment with this changelog : 'db.changelog-${name}.mysql.sql'`.debug);
    logVerbose(`${cmd} \
    updateSQL`);
    const { code, stdout, stderr } = shell.exec(
      `${cmd} \
        updateSQL`,
      { silent: process.env.DEBUG === 'false' },
    );

    if (code !== 0) {
      throw new Error(stderr || stdout.replace(/#.*\n/gm, ''));
    }

    console.log(stdout);
    console.log('[DRY-RUN] Nothing has been executed.'.success);
    console.log("To execute the migration command. Run the same command without '--dry-run'".action);

    return;
  }

  console.log(`[ACTION] Will execute the update on ${environment}`.action);
  let response = null;

  // 1. register to cloud hub (if defined)
  if (process.env.API_KEY && process.env.API_KEY !== '' && process.env.PROJECT_ID && process.env.PROJECT_ID !== '') {
    console.log('[ACTION] Registering changelog'.action);
    logVerbose(`${cmd} \
    registerChangeLog`);
    response = shell.exec(
      `${cmd} \
      registerChangeLog`,
      { silent: process.env.DEBUG === 'false' },
    );

    if (response && response.code !== 0) {
      logDebug(`Response code : ${response.code}`);
      if (response.stderr.includes('is already registered') || response.stdout.includes('is already registered')) {
        logDebug('It is safe to continue');
        console.log('[WARN] Changelog already registred.'.warn);
      } else if (
        response.stderr.includes("'hubProjectId' has invalid value 'undefined'") ||
        response.stdout.includes("'hubProjectId' has invalid value 'undefined'")
      ) {
        logDebug('It is safe to continue');
        console.log('[WARN] Liquibase hub not configured.'.warn);
      } else {
        throw new Error(response.stderr || response.stdout);
      }
    }
  } else {
    console.log(`${'[SKIP]'.info} Skipping registration.`);
  }

  // 2. update the targetted database
  console.log('[ACTION] Update the database schema'.action);
  logVerbose(`${cmd} \
  update`);
  response = shell.exec(
    `${cmd} \
    update`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  // 3. tag the changesets to enable the rollback functionnality
  console.log(`[ACTION] Tag the changelog ${branchName}-${lastCommitId}`.action);

  logVerbose(`${cmd} \
  tag ${branchName}-${lastCommitId}`);
  response = shell.exec(
    `${cmd} \
    tag ${branchName}-${lastCommitId}`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  console.log(`[DONE] Migration deployed to ${environment} successfully`.success);
}

module.exports = {
  createMigration,
  deployMigration,
};
