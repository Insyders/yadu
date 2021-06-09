const AWS = require('aws-sdk');
const path = require('path');
const colors = require('colors');
const { retrieveSecrets } = require('./secretManager');
const { logDebug, logVerbose } = require('../globals/utils');
const Config = require('./classes/Config');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  debug: 'grey',
  success: ['green'],
  action: 'cyan',
});

// TODO: Later this variable will be automatically populated using the nearest .git folder
const BASE_PATH = path.join('.', '.yadu') + path.sep;

/**
 *
 * @param {Object} args
 */
function assignVariables(args = {}) {
  // Build DB URLs
  //   Reference Database
  if (args['db-url-ref'] || process.env.DB_URL_REF) {
    console.debug('Build DB_URL_REF');
    if (!args['db-extra-ref'] && !process.env.DB_EXTRA_REF) {
      console.log(`${'[WARN]'.warn} --db-extra-ref or DB_EXTRA_REF is not defined, using 'useUnicode=true&characterEncoding=UTF-8'`);
    }
    if (!args['db-port-ref'] && !process.env.DB_PORT_REF) {
      console.log(`${'[WARN]'.warn} --db-port-ref or DB_PORT_REF is not defined, using '3306'`);
    }
    if (!args['db-name-ref'] && !process.env.DB_NAME_REF) {
      console.error(`${'[ERROR]'.error} --db-name-ref or DB_NAME_REF is not defined`);
      throw new Error('--db-name-ref or DB_NAME_REF is not defined');
    }
    process.env.DB_URL_REF = `jdbc:mysql://${args['db-url-ref'] || process.env.DB_URL_REF}:${
      args['db-port-ref'] || process.env.DB_PORT_REF || 3306
    }/${args['db-name-ref'] || process.env.DB_NAME_REF || null}?${
      args['db-extra-ref'] || process.env.DB_EXTRA_REF || 'useUnicode=true&characterEncoding=UTF-8'
    }`;
  }
  //   Primary Database
  if (args['db-url'] || process.env.DB_URL) {
    console.debug('Build DB_URL');
    if (!args['db-extra'] && !process.env.DB_EXTRA) {
      console.log(`${'[WARN]'.warn} --db-extra or DB_EXTRA is not defined, using 'useUnicode=true&characterEncoding=UTF-8'`);
    }
    if (!args['db-port'] && !process.env.DB_PORT) {
      console.log(`${'[WARN]'.warn} --db-port or DB_PORT is not defined, using '3306'`);
    }
    if (!args['db-name'] && !process.env.DB_NAME) {
      console.error(`${'[ERROR]'.error} --db-name or DB_NAME is not defined`);
      throw new Error('--db-name or DB_NAME is not defined');
    }
    process.env.DB_URL = `jdbc:mysql://${args['db-url'] || process.env.DB_URL}:${args['db-port'] || process.env.DB_PORT || 3306}/${
      args['db-name'] || process.env.DB_NAME || null
    }?${args['db-extra'] || process.env.DB_EXTRA || 'useUnicode=true&characterEncoding=UTF-8'}`;
  }

  // Override env variables
  if (args['db-user-ref']) {
    console.debug('Override DB_USER_REF');
    process.env.DB_USER_REF = args['db-user-ref'];
  }
  if (args['db-user']) {
    console.debug('Override DB_USER');
    process.env.DB_USER = args['db-user'];
  }

  if (args['db-pass-ref']) {
    console.debug('Override DB_PASS_REF');
    process.env.DB_PASS_REF = args['db-pass-ref'];
  }
  if (args['db-pass']) {
    console.debug('Override DB_PASS');
    process.env.DB_PASS = args['db-pass'];
  }
  if (args['db-name']) {
    console.debug('Override DB_NAME');
    process.env.DB_NAME = args['db-name'];
  }
  if (args['db-name-ref']) {
    console.debug('Override DB_NAME_REF');
    process.env.DB_NAME_REF = args['db-name-ref'];
  }
}

/**
 *
 * @param {Object} args
 */
function configureProfileAndRegion(args = {}) {
  process.env.AWS_PROFILE = args.profile || process.env.AWS_PROFILE || process.env.PROFILE || 'default';
  process.env.AWS_REGION = args.region || process.env.AWS_REGION || process.env.REGION || 'us-east-1';

  if (args.env) {
    console.log(`Override NODE_ENV variable with '${args.env}'`.debug);
    process.env.NODE_ENV = args.env;
    console.debug(path.resolve(process.cwd(), process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'));
  }
}

/**
 *
 * @param {Object} args
 * @returns Object
 */
const loadArgs = async (args = {}) => {
  logDebug('Loading Env. variables'.info);

  configureProfileAndRegion(args);

  const config = Config.LoadConfig(`${BASE_PATH + (process.env.NODE_ENV || 'config')}.json`);

  // Configure AWS SDK using the process.env variables
  const credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE });
  AWS.config.credentials = credentials;
  AWS.config.region = process.env.AWS_REGION;
  // Load data from secret manager
  await retrieveSecrets(process.env.SECRETS || args.secrets || null);

  // Load local .env.ENVIRONMENT file
  // eslint-disable-next-line global-require
  require('dotenv').config({
    path: path.resolve(process.cwd(), process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'),
  });

  assignVariables(args);

  if (args.verbose) {
    // Print the env. variables. Be careful.
    console.debug(process.env);
  }

  logVerbose(process.env);
  return config || {};
};

module.exports = {
  loadArgs,
  configureProfileAndRegion,
  assignVariables,
};
