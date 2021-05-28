#!/usr/bin/env node
/* eslint-disable global-require */

const args = require('minimist')(process.argv.slice(2));
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const AWS = require('aws-sdk');
const { retrieveSecrets } = require('../lib/secretManager');
const header = require('../lib/header');
const { logDebug } = require('../liquibase/src/utils');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'blue',
  data: 'grey',
  help: ['cyan'],
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
  success: ['green', 'underline'],
});

if (args.debug) {
  console.log('Enabling Debug Mode'.debug);
  process.env.debug = 'true';
}
if (args.verbose) {
  console.log('Enabling Verbose Mode'.verbose);
  process.env.verbose = 'true';
}

async function LoadEnv() {
  logDebug('Loading Env. variables'.info);

  process.env.AWS_PROFILE = args.profile || process.env.AWS_PROFILE || process.env.PROFILE || 'default';
  process.env.AWS_REGION = args.region || process.env.AWS_REGION || process.env.REGION || 'us-east-1';

  if (args.env) {
    console.log(`Override NODE_ENV variable with '${args.env}'`.debug);
    process.env.NODE_ENV = args.env;
    console.debug(path.resolve(process.cwd(), process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'));
  }

  // Configure AWS SDK using the process.env variables
  const credentials = new AWS.SharedIniFileCredentials({ profile: process.env.AWS_PROFILE });
  AWS.config.credentials = credentials;
  AWS.config.region = process.env.AWS_REGION;
  // Load data from secret manager
  await retrieveSecrets(process.env.SECRETS || args.secrets || null);

  // Load local .env.ENVIRONMENT file
  require('dotenv').config({
    path: path.resolve(process.cwd(), process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env'),
  });

  // Build DB URLs
  if (args['db-url-ref'] || process.env.DB_URL_REF) {
    console.debug('Build DB_URL_REF');
    if (!args['db-extra-ref'] && !process.env.DB_EXTRA_REF) {
      console.error(`${'[WARN]'.warn} --db-extra-ref or DB_EXTRA_REF is not defined, using 'useUnicode=true&characterEncoding=UTF-8'`);
    }
    if (!args['db-port-ref'] && !process.env.DB_PORT_REF) {
      console.error(`${'[WARN]'.warn} --db-port-ref or DB_PORT_REF is not defined, using '3306'`);
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
  if (args['db-url'] || process.env.DB_URL) {
    console.debug('Build DB_URL');
    if (!args['db-extra'] && !process.env.DB_EXTRA) {
      console.error(`${'[WARN]'.warn} --db-extra or DB_EXTRA is not defined, using 'useUnicode=true&characterEncoding=UTF-8'`);
    }
    if (!args['db-port'] && !process.env.DB_PORT) {
      console.error(`${'[WARN]'.warn} --db-port or DB_PORT is not defined, using '3306'`);
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

  if (args.verbose) {
    // Print the env. variables. Be careful.
    console.debug(process.env);
  }
}

(async () => {
  try {
    header();
    await LoadEnv();

    // Load everything after setting the appropriate environment variables
    // Otherwise the process.env isn't configured properly.
    const { version } = require('../package.json');
    const { checkGITCLI, checkZIPCLI } = require('../lib/utils');
    const { publish } = require('../lib/logic');
    const { Handler } = require('../liquibase');

    const PROFILE = process.env.AWS_PROFILE;
    const REGION = process.env.AWS_REGION;

    shell.echo(`WORK IN PROGRESS; Version ${version}; Using AWS_REGION=${REGION} & AWS_PROFILE=${PROFILE}`.data);

    if (args.help || !args || args.length === 1) {
      console.log(fs.readFileSync(path.join(__dirname, '..', 'CLI.txt'), { encoding: 'utf-8' }));
      process.exit(0);
    }

    // handle liquibase commands
    await Handler(args);

    if (!REGION && !args['package-only']) {
      console.error(`${'[ERROR]'.error} The \`AWS_REGION\`, \`REGION\` environment variable or \`--region=<string>\` is required`);
      process.exit(1);
    }

    checkZIPCLI();
    checkGITCLI();

    publish(args)
      .then(() => {
        process.exit(0);
      })
      .catch((e) => {
        console.error(`${'[ERROR]'.error} ${e.message}`);
        process.exit(1);
      });
  } catch (e) {
    console.error(`${'[ERROR]'.error} ${e.message}`);
    process.exit(2);
  }
})();
