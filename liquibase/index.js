const path = require('path');
const colors = require('colors');
const shell = require('shelljs');
const { generateMainFile } = require('./src/main');

// Load env. variables from .env.NODE_ENV file.
require('dotenv').config({
  path: path.resolve(process.cwd(), process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'),
});

const { logDebug, isHome } = require('../libs/globals/utils');
const { createMigration, deployMigration } = require('./src/migration');
const { createVersion } = require('./src/version');
const { sync } = require('./src/sync');
const { diff } = require('./src/diff');
const { clearCheckSums } = require('./src/clear');
const { rollback } = require('./src/rollback');
const { Validation, CheckBasePath, Triggered } = require('./lib/validation');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  debug: 'grey',
  info: 'blue',
  success: ['green'],
  action: 'cyan',
});

// ---

const { NODE_ENV } = process.env;

// TODO: NEED REFACTOR it burns my eyes..
// basePath uses the current working directory. But in fact it must use the homeDir defined by our function.
const home = isHome(process.cwd());

let basePath =
  home.path +
  (process.env.BASE_PATH || process.platform === 'win32'
    ? `${path.join('.', 'mysql', 'changelog')}${path.sep}`.split(path.sep).join(path.posix.sep)
    : `${path.join('.', 'mysql', 'changelog')}${path.sep}`);

if (process.platform === 'win32') {
  // If using git bash inside windows..
  basePath = basePath.split(path.sep).join(path.posix.sep);
}

const classPath =
  process.env.CLASS_PATH || process.platform === 'win32'
    ? `${path.join(__dirname, 'lib')}${path.sep}mysql-connector-java-8.0.24.jar`.split(path.sep).join(path.posix.sep)
    : `${path.join(__dirname, 'lib')}${path.sep}mysql-connector-java-8.0.24.jar`;
// ERRATA : On windows You must use git bash or WSL
const liquibaseBasePath =
  process.env.LIQUIBASE_BASE_PATH || process.platform === 'win32'
    ? `${path.join(__dirname, 'lib', 'liquibase-4.3.5')}${path.sep}liquibase`.split(path.sep).join(path.posix.sep)
    : `${path.join(__dirname, 'lib', 'liquibase-4.3.5')}${path.sep}liquibase`;
const liquibaseConfPath =
  process.env.LIQUIBASE_CONF_PATH || process.platform === 'win32'
    ? `${path.join('.')}${path.sep}liquibase.properties`.split(path.sep).join(path.posix.sep)
    : `${path.join('.')}${path.sep}liquibase.properties`;

// DEBUGGING
logDebug(`Base Path: ${basePath}`);
logDebug(`Liquibase base Path: ${liquibaseBasePath}`);
logDebug(`Liquibase Config Path: ${liquibaseConfPath}`);
logDebug(`Class Path: ${classPath}`);

// ---

async function Handler(args) {
  logDebug('[LIQUIBASE HANDLER]');

  let handled = false;
  logDebug(args);

  if (args['liquibase-help']) {
    console.log('Print Liquibase Help'.action);
    console.log('>>>');
    shell.exec(liquibaseBasePath);
    console.log('<<<');
    process.exit(0);
  }

  const dryrun = !!args['dry-run'];
  process.env.dryrun = dryrun;

  // To avoid the missing mysql/changelog path error.
  if (Triggered(args) && !CheckBasePath(basePath)) {
    logDebug('SKIPPING');
    return Promise.resolve(false);
  }

  // This one doesn't required to have access to the actual database
  if (args['create-migration'] && args.name) {
    console.log('Create new migration'.action);
    if (!args.name) {
      throw new Error("Missing --name=<String>; e.g --name='ABC-123'");
    }
    console.log('>>>');
    createMigration(args.name, basePath);
    console.log('<<<');
    handled = true;
  }

  // The following commands require a database configuration.
  if (!handled && !Validation(args)) {
    return Promise.resolve(false);
  }

  if (args['generate-main']) {
    console.log('Generate main.xml File'.action);
    console.log('>>>');
    await generateMainFile(liquibaseBasePath, liquibaseConfPath, basePath, classPath);
    console.log('<<<');
    handled = true;
  }

  if (args['deploy-migration'] && args.name) {
    const env = args.env || NODE_ENV || null;
    if (!env) {
      throw new Error("Missing '--env' or 'NODE_ENV', the `env` value must be one of the filename available in `.yadu/`");
    }
    if (!args.name) {
      throw new Error("Missing --name=<String>; e.g --name='ABC-123'");
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
    console.log(`${'[WARN'.warn} This command doesn't extract a valid MySQL and will be reworked in another ticket.`);
    console.log(`Create ${args.version} version`.action);
    console.log('>>>');
    createVersion(args.version, liquibaseBasePath, liquibaseConfPath, basePath, classPath);
    console.log('<<<');
    handled = true;
  }

  if (handled) {
    console.log('Command executed.'.debug);
    return Promise.resolve(true);
  }

  console.error(`${'[ERROR]'.error} Invalid or Missing Parameters`);
  process.exit(1337);
}

module.exports = {
  Handler,
};
