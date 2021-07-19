const fs = require('fs');
const path = require('path');
const { logDebug } = require('../../globals/utils');

const { DB_USER, DB_PASS, API_KEY, DB_URL, PROJECT_ID } = process.env;

const commands = [
  'liquibase-help',
  'generate-main',
  'create-migration',
  'deploy-migration',
  'sync',
  'diff',
  'clear',
  'rollback',
  'create-version',
];

function Triggered(args) {
  if (Object.keys(args).filter((arg) => commands.includes(arg)).length === 0) {
    logDebug('Liquibase Handler: Nothing to do...'.debug);
    return false;
  }

  return true;
}

function Validation(args) {
  const errors = [];

  if (Object.keys(args).filter((arg) => commands.includes(arg)).length === 0) {
    logDebug('Liquibase Handler: Nothing to do...'.debug);
    return false;
  }

  if (!DB_USER || DB_USER === '') {
    errors.push(`${'[ERROR]'.error} Missing Environment variable 'DB_USER', Please read the documentation or use the --env=<filename>`);
  }
  if (!DB_PASS || DB_PASS === '') {
    errors.push(`${'[ERROR]'.error} Missing Environment variable 'DB_PASS', Please read the documentation or use the --env=<filename>`);
  }
  if (!DB_URL || DB_URL === '') {
    errors.push(`${'[ERROR]'.error} Missing Environment variable 'DB_URL', Please read the documentation or use the --env=<filename>`);
  }
  if (!API_KEY || API_KEY === '') {
    console.log(`${'[WARN]'.warn} Missing Environment variable 'API_KEY', Please read the documentation or use the --env=<filename>`);
  }
  if (!PROJECT_ID || PROJECT_ID === '') {
    console.log(`${'[WARN]'.warn} Missing Environment variable 'PROJECT_ID', Please read the documentation or use the --env=<filename>`);
  }

  if (errors && errors.length > 0) {
    errors.forEach((e) => console.error(e));
    process.exit(1337);
  }
  return true;
}

function CheckBasePath(basePath) {
  try {
    if (fs.statSync(path.resolve(basePath)).isDirectory()) {
      return true;
    }
    return false;
  } catch (e) {
    throw new Error(e.message);
  }
}

module.exports = {
  Validation,
  CheckBasePath,
  Triggered,
};
