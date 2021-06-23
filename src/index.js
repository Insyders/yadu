#!/usr/bin/env node
/* eslint-disable global-require */

const args = require('minimist')(process.argv.slice(2));
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const header = require('../lib/header');
const { loadArgs } = require('../lib/loadArgs');
const template = require('../lib/template');
const config = require('../lib/config');
const { logDebug, logVerbose } = require('../globals/utils');
const { CheckLocalVersion } = require('../lib/currentVersion');
const mysqlDumpHandler = require('../mysqlDump/mysqlDumpHandler');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'magenta',
  prompt: 'grey',
  info: 'blue',
  data: 'grey',
  help: ['cyan'],
  warn: 'yellow',
  debug: 'grey',
  error: 'red',
  success: ['green', 'underline'],
});

if (args['fail-on-load']) {
  console.log('Enabling fail on load'.debug);
  process.env.FAIL_ON_LOAD = 'true';
}

if (args.debug) {
  console.log('Enabling Debug Mode'.debug);
  process.env.DEBUG = 'true';
}
if (args.verbose) {
  console.log('Enabling Verbose Mode'.verbose);
  process.env.VERBOSE = 'true';
}

(async () => {
  try {
    header();
    CheckLocalVersion();
    logDebug('[DEBUGGING] Enabled');
    logVerbose('[VERBOSE] Enabled');
    logVerbose(`Shell (comspec): ${process.env.comspec}`);
    logVerbose(`Shell (COMSPEC): ${process.env.COMSPEC}`);

    if (process.platform === 'win32') {
      logDebug('Using Windows');
      if (process.env.comspec.includes('cmd.exe')) {
        console.log(`${'[INFO]'.info} Modifying the 'comspec' environment variable to use : 'C:\\Program Files\\Git\\bin\\bash.exe'`);
        process.env.comspec = 'C:\\Program Files\\Git\\bin\\bash.exe';
      }
    } else {
      logDebug('Using Linux');
    }

    let configService;
    if (args && Object.keys(args).length > 1) {
      configService = await loadArgs(args).catch((e) => {
        if (e && e.code === 'CredentialsError') {
          console.error('[Missing AWS Credentials]\nSolution:\nexport AWS_REGION=us-east-1\nexport AWS_PROFILE=default'.error);
          throw e;
        }
        if (process.env.FAIL_ON_LOAD === 'true') {
          throw e;
        } else {
          console.log(`${'[WARN]'.warn} Failed to load the configuration`);
        }
      });
    }

    if (args['show-config']) {
      console.debug(configService);
    }

    // Load everything after setting the appropriate environment variables
    // Otherwise the process.env isn't configured properly.
    const { checkGITCLI, checkZIPCLI } = require('../lib/utils');
    const { publish } = require('../lib/logic');
    const { Handler } = require('../liquibase');

    const PROFILE = process.env.AWS_PROFILE;
    const REGION = process.env.AWS_REGION;

    shell.echo(`Using AWS_REGION=${REGION} & AWS_PROFILE=${PROFILE}`.action);

    if (args.help || !args || Object.keys(args).length === 1) {
      console.log('\n');
      console.log(fs.readFileSync(path.join(__dirname, '..', 'CLI.txt'), { encoding: 'utf-8' }));

      if (!args || Object.keys(args).length === 1) {
        console.log(`${'WARN'.warn} no arguments provided.`);
      }

      process.exit(0);
    }

    // Handle MysqlDump
    const mysqlDumpHandled = mysqlDumpHandler(args, config);
    if (mysqlDumpHandled) {
      process.exit(0);
    }

    // handle liquibase commands
    const handled = await Handler(args);
    if (handled) {
      process.exit(0);
    }

    // handle template creation
    const templateHandled = await template(args);
    if (templateHandled) {
      process.exit(0);
    }

    // handle template creation
    const configHandled = await config(args);
    if (configHandled) {
      process.exit(0);
    }

    if (!REGION && !args['package-only']) {
      console.error(`${'[ERROR]'.error} The \`AWS_REGION\`, \`REGION\` environment variable or \`--region=<string>\` is required`);
      process.exit(1);
    }

    checkZIPCLI();
    checkGITCLI();

    publish(args, configService)
      .then(() => {
        process.exit(0);
      })
      .catch((e) => {
        logDebug(e);
        console.error(`${'[ERROR]'.error} ${e.message}`);
        process.exit(1);
      });
  } catch (e) {
    logDebug(e);
    console.error(`${'[ERROR]'.error} ${e.message}`);
    process.exit(2);
  }
})();
