const { userInfo } = require('os');
const fs = require('fs');
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
  // Force name to be lowercase
  name = name.toLowerCase();

  if (dryrun === true) {
    console.log(`DRY-RUN: Using '${environment}' environment with this changelog : 'db.changelog-${name}.mysql.sql'`.debug);
    const { code, stdout, stderr } = shell.exec(
      `${liquibaseBasePath} \
        --changeLogFile='${path.join(basePath)}db.changelog-${name}.mysql.sql' \
        --url='${process.env.DB_URL}' \
        --classpath=${classPath} \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        updateSQL`,
      { silent: !process.env.DEBUG },
    );

    if (code !== 0) {
      throw new Error(stderr || stdout.replace(/#.*\n/gm, ''));
    }

    console.log(stdout);
    console.log('DRY-RUN : Nothing has been executed.'.success);
    console.log("To execute the migration command. Run the same command with '--no-dry-run'".action);

    return;
  }

  console.log(`Will execute the update on ${environment}`.action);

  const lastCommitId = getCommitId().substring(0, 8);
  const branchName = getBranchName();
  let response = null;

  // 1. register to cloud hub
  console.log('Registring changelog'.action);
  response = shell.exec(
    `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath)}db.changelog-${name}.mysql.sql' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    registerChangeLog`,
    { silent: !process.env.DEBUG },
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
  console.log('Update the database schema'.action);
  response = shell.exec(
    `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath)}db.changelog-${name}.mysql.sql' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    update`,
    { silent: !process.env.DEBUG },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  // 3. tag the changesets to enable the rollback functionnality
  console.log(`Tag the changelog ${branchName}-${lastCommitId}`.action);
  response = shell.exec(
    `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath)}db.changelog-${name}.mysql.sql' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    tag ${branchName}-${lastCommitId}`,
    { silent: !process.env.DEBUG },
  );

  if (response && response.code !== 0) {
    logDebug(`Response code : ${response.code}`);

    throw new Error(response.stderr || response.stdout);
  }

  console.log(`Migration deployed to ${environment} successfully`.success);
}

module.exports = {
  createMigration,
  deployMigration,
};
