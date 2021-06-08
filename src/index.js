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

(async () => {
  try {
    header();
    await loadArgs(args);

    // Load everything after setting the appropriate environment variables
    // Otherwise the process.env isn't configured properly.
    const { version } = require('../package.json');
    const { checkGITCLI, checkZIPCLI } = require('../lib/utils');
    const { publish } = require('../lib/logic');
    const { Handler } = require('../liquibase');

    const PROFILE = process.env.AWS_PROFILE;
    const REGION = process.env.AWS_REGION;

    shell.echo(`WORK IN PROGRESS; Version ${version}; Using AWS_REGION=${REGION} & AWS_PROFILE=${PROFILE}`.data);

    if (args.help || !args || Object.keys(args).length === 1) {
      console.log('\n');
      console.log(fs.readFileSync(path.join(__dirname, '..', 'CLI.txt'), { encoding: 'utf-8' }));

      if (!args || Object.keys(args).length === 1) {
        console.log(`${'WARN'.warn} no arguments provided.`);
      }

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
