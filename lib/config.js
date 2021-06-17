const { prompt } = require('inquirer');
const path = require('path');
const { logDebug } = require('../globals/utils');
const Config = require('./classes/Config');

const questions = [
  {
    name: 'destination',
    type: 'input',
    message: `*YaDU configuration destination:`,
    default: `.${path.sep}`,
  },
  {
    type: 'list',
    name: 'region',
    message: '*AWS Region:',
    default: 'us-east-1',
    choices: [
      'us-east-2',
      'us-east-1',
      'us-west-1',
      'us-west-2',
      'af-south-1',
      'ap-east-1',
      'ap-south-1',
      'ap-northeast-3',
      'ap-northeast-2',
      'ap-southeast-1',
      'ap-southeast-2',
      'ap-northeast-1',
      'ca-central-1',
      'eu-central-1',
      'eu-west-1',
      'eu-west-2',
      'eu-south-1',
      'eu-west-3',
      'eu-north-1',
      'me-south-1',
      'sa-east-1',
    ],
  },
  {
    name: 'accountId',
    type: 'input',
    message: '*AWS Account Id:',
    validate(input) {
      if (/[0-9]*/.test(input) && input.length === 12) {
        return true;
      }
      return 'The AWS Account ID may only include Numbers and must have 12 numbers';
    },
  },
  {
    name: 'stage',
    type: 'input',
    message: '*Stage:',
    default: 'dev',
  },
  {
    name: 'lambdaBasePath',
    type: 'input',
    message: `*Lambda Directory (Relative path):`,
    default: `..${path.sep}`,
  },
  {
    name: 'applicationYaml',
    type: 'input',
    message: `*Application YAML path (Relative path):`,
    default: `..${path.sep}cloudformation${path.sep}application.yaml`,
  },
  {
    name: 'debug',
    type: 'confirm',
    message: '*Debug Mode (Y/N):',
    default: 'N',
  },
  {
    name: 'layerVersion',
    type: 'number',
    message: 'Layer Version:',
    validate(input) {
      if (/[0-9]*/.test(input)) {
        return true;
      }
      return 'The layer version may only include Numbers';
    },
  },
  {
    name: 'secrets',
    type: 'input',
    message: 'Secrets (comma-delimited list):',
    default: 'db-dev,db-qa:ref',
  },
  {
    name: 'mysqlBasePath',
    type: 'input',
    message: `*SQL Base Path:`,
    default: path.join('.', 'mysql', 'changelog') + path.sep,
  },
  {
    name: 'liquibaseBasePath',
    type: 'input',
    message: '*Liquibase Base Path:',
    default: null,
  },
  {
    name: 'liquibaseConfPath',
    type: 'input',
    message: '*Liquibase Configuration Path:',
    default: null,
  },
  {
    name: 'classPath',
    type: 'input',
    message: '*Liquibase Class Path:',
    default: null,
  },
  {
    name: 'mapping',
    type: 'editor',
    default: '{"foo":"bar"}',
  },
  {
    name: 'validation',
    type: 'confirm',
    message: 'Is it OK ? (Y/N):',
    default: 'Y',
  },
];

/**
 *
 * @param {*} mapping
 * @returns Object
 */
function parseMapping(mapping) {
  try {
    return JSON.parse(mapping);
  } catch (e) {
    console.error(`${'[ERROR]'.error} ParseMapping: ${e.message}`);
    return {};
  }
}

/**
 *
 * @param {Object} args
 * @returns Boolean
 */
module.exports = async (args) => {
  try {
    if (!args.init) {
      return false;
    }

    let destination = path.join('./');
    const config = {
      debug: true,
      region: 'us-east-1',
      layerVersion: null,
      accountId: '123456789012',
      lambdaBasePath: '../',
      stage: '',
      mapping: {
        foo: 'bar',
      },
      secrets: 'db-dev,db-qa:ref',
      mysqlBasePath: 'mysql/changelog/',
      liquibaseBasePath: null,
      liquibaseConfPath: null,
      classPath: null,
      applicationYaml: `..${path.sep}cloudformation${path.sep}application.yaml`,
    };

    if (args.interactive) {
      const answers = await prompt(questions);
      logDebug(answers);
      if (!answers.validation) {
        return true;
      }

      const mapping = parseMapping(answers.mapping);

      destination = answers.destination;

      Object.keys(answers).forEach((key) => {
        config[key] = answers[key];
      });

      config.mapping = mapping;
      logDebug(config);
    }

    Config.CreateConfig(destination, config);

    console.log(`${'[SUCCESS]'.success} Configuration successfully created`);

    return true;
  } catch (e) {
    logDebug(e);
    console.error(e.message);
    throw e;
  }
};
