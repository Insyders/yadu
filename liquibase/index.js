const path = require('path');
const colors = require('colors');
const { generateMainFile } = require('./src/main');
require('dotenv').config({
  path: path.resolve(process.cwd(), process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'),
});

const { logDebug } = require('./src/utils');
const { createMigration, deployMigration } = require('./src/migration');
const { createVersion } = require('./src/version');
const { sync } = require('./src/sync');
const { diff } = require('./src/diff');
const { clearCheckSums } = require('./src/clear');
const { rollback } = require('./src/rollback');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  debug: 'grey',
  success: ['green'],
  action: 'cyan',
});

// ---

const { DB_USER, DB_PASS, API_KEY, DB_URL, PROJECT_ID, NODE_ENV } = process.env;

const commands = ['generate-main', 'create-migration', 'deploy-migration', 'sync', 'diff', 'clear', 'rollback', 'create-version'];

const basePath = process.env.BASE_PATH || path.join('.', 'mysql', 'changelog') + path.sep;
const classPath = process.env.CLASS_PATH || `${path.join(__dirname, 'lib')}${path.sep}mysql-connector-java-8.0.24.jar`;
let liquibaseBasePath = process.env.LIQUIBASE_BASE_PATH || `${path.join(__dirname, 'lib', 'liquibase-4.3.5')}${path.sep}liquibase`;
if (process.platform === 'win32') {
  liquibaseBasePath = process.env.LIQUIBASE_BASE_PATH || `${path.join(__dirname, 'lib', 'liquibase-4.3.5')}${path.sep}liquibase.cmd`;
}
const liquibaseConfPath = process.env.LIQUIBASE_CONF_PATH || `${path.join('.')}${path.sep}liquibase.properties`;

// DEBUGGING
logDebug(basePath);
logDebug(liquibaseBasePath);
logDebug(liquibaseConfPath);

// ---

function Validation(args) {
  const errors = [];

  if (Object.keys(args).filter((arg) => commands.includes(arg)).length === 0) {
    logDebug('Liquibase Handler: Nothing to do...'.debug);
    return false;
  }

  if (!DB_USER || DB_USER === '') {
    errors.push(`${'[ERROR]'.error} Missing Environment variable 'DB_USER'`);
  }
  if (!DB_PASS || DB_PASS === '') {
    errors.push(`${'[ERROR]'.error} Missing Environment variable 'DB_PASS'`);
  }
  if (!DB_URL || DB_URL === '') {
    errors.push(`${'[ERROR]'.error} Missing Environment variable 'DB_URL'`);
  }
  if (!API_KEY || API_KEY === '') {
    console.log(`${'[WARN]'.warn} Missing Environment variable 'API_KEY'`);
  }
  if (!PROJECT_ID || PROJECT_ID === '') {
    console.log(`${'[WARN]'.warn} Missing Environment variable 'PROJECT_ID'`);
  }

  if (errors && errors.length > 0) {
    errors.forEach((e) => console.error(e));
    process.exit(1337);
  }
  return true;
}

async function Handler(args) {
  let handled = false;
  if (!Validation(args)) {
    return;
  }

  logDebug(args);
  const dryrun = args['dry-run'] || args['dry-run'] === undefined;

  if (args['generate-main']) {
    console.log('Generate main.xml File'.action);
    console.log('>>>');
    await generateMainFile(liquibaseBasePath, liquibaseConfPath, basePath, classPath);
    console.log('<<<');
    handled = true;
  }

  if (args['create-migration'] && args.name) {
    console.log('Create new migration'.action);
    console.log('>>>');
    createMigration(args.name, basePath);
    console.log('<<<');
    handled = true;
  }

  if (args['deploy-migration'] && args.name) {
    const env = args.env || NODE_ENV || null;
    if (!env) {
      throw new Error("Missing '--env' or 'NODE_ENV'");
    }
    console.log(`Deploy migration ${args.name}`.action);
    console.log('>>>');
    deployMigration(args.name, env, liquibaseBasePath, liquibaseConfPath, basePath, classPath, dryrun);
    console.log('<<<');
    handled = true;
  }

  if (args.sync) {
    console.log('Deploy all available migrations'.action);
    console.log('>>>');
    await generateMainFile(liquibaseBasePath, liquibaseConfPath, basePath, classPath);
    sync(liquibaseBasePath, liquibaseConfPath, basePath, classPath, dryrun);
    console.log('<<<');
    handled = true;
  }

  if (args.diff) {
    console.log('Compare 2 databases'.action);
    console.log('>>>');
    diff(liquibaseBasePath, liquibaseConfPath, classPath);
    console.log('<<<');
    handled = true;
  }

  if (args.clear) {
    console.log('Clear Migration checksums'.action);
    console.log('>>>');
    clearCheckSums(liquibaseBasePath, liquibaseConfPath, basePath, classPath);
    console.log('<<<');
    handled = true;
  }

  if (args.rollback && args.name) {
    console.log('Rollback to specified tag'.action);
    console.log('>>>');
    rollback(liquibaseBasePath, liquibaseConfPath, basePath, classPath, args.name, args.tag, dryrun);
    console.log('<<<');
    handled = true;
  }

  if (args['create-version'] && args.version) {
    console.log(`Create ${args.version} version`.action);
    console.log('>>>');
    createVersion(args.version, liquibaseBasePath, liquibaseConfPath, basePath, classPath);
    console.log('<<<');
    handled = true;
  }

  if (handled) {
    console.log('Command executed.'.debug);
    process.exit(0);
  }

  console.error(`${'[ERROR]'.error} Invalid or Missing Parameters`);
  process.exit(1337);
}

module.exports = {
  Handler,
};
