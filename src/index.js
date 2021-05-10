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

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
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
  console.log('Loading Env. variables'.info);

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

  // Override env variables
  if (args['db-url-ref']) {
    console.debug('Override DB_URL_REF');
    process.env.DB_URL_REF = args['db-url-ref'];
  }
  if (args['db-user-ref']) {
    console.debug('Override DB_USER_REF');
    process.env.DB_USER_REF = args['db-user-ref'];
  }
  if (args['db-pass-ref']) {
    console.debug('Override DB_PASS_REF');
    process.env.DB_PASS_REF = args['db-pass-ref'];
  }

  if (args.verbose) {
    console.debug(process.env);
  }
}

(async () => {
  try {
    header();
    await LoadEnv();

    // Load everything after setting the appropriate environment variables
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
