const { prompt } = require('inquirer');
const { logDebug } = require('../liquibase/src/utils');
const Template = require('./classes/Template');

const questions = [
  {
    name: 'functionName',
    type: 'input',
    message: '*Function name:',
    validate(input) {
      if (/^([A-Za-z0-9-])+$/.test(input)) {
        return true;
      }
      return 'The lambda function name may only include letters, numbers or -';
    },
  },
  {
    name: 'description',
    type: 'input',
    message: 'Lambda Description:',
    default: 'Fill me later',
  },
  {
    name: 'logRetention',
    type: 'input',
    message: 'Log retention (in days):',
    default: 90,
    validate(input) {
      if (/[0-9]*/.test(input)) {
        return true;
      }
      return 'The log retention may only include Numbers';
    },
  },
  {
    name: 'sns',
    type: 'input',
    message: 'SNS to receive alarms:',
    default: '',
  },
  {
    name: 'lambdaBasePath',
    type: 'input',
    message: "Lambda Directory (Relative path, Default: '../':",
    default: '../',
  },
  {
    name: 'withAllParams',
    type: 'input',
    message: 'Specify all params instead of using the globals (Y/N):',
    default: 'N',
  },
  {
    name: 'validation',
    type: 'input',
    message: 'Is it OK ? (Y/N):',
    default: 'Y',
  },
];

module.exports = async (args) => {
  try {
    if (!args.template) {
      return false;
    }
    const answers = await prompt(questions);
    logDebug(answers);
    if (answers.validation.toLowerCase() !== 'y') {
      return true;
    }

    const functionNameProcessed = answers.functionName.toLowerCase();
    logDebug(functionNameProcessed);

    const { description, logRetention, sns, lambdaBasePath, withAllParams } = answers;

    const template = new Template({
      functionName: functionNameProcessed,
      description,
      logRetention,
      sns: sns && sns !== '' ? sns : null,
      lambdaBasePath,
      withAllParams: !(withAllParams && withAllParams.toLowerCase() !== 'y'),
    });

    template.GenerateLambdaSAM();
    template.GenerateLambdaAlarm();
    template.GenerateLambdaLogGroup();
    console.log('\n');
    console.log(template.ConvertToYaml());

    console.log(`${'[SUCCESS]'.success} Copy the lines above in your application.yaml`);

    return true;
  } catch (e) {
    console.error(e.message);
    throw e;
  }
};
