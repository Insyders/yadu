// Goal: Use node -r yadu/config
// It is to load the environment variables based on the secrets values, but the async/await doesn't work with that approach.

const { logDebug } = require('./libs/globals/utils');
const { loadArgs } = require('./libs/loadArgs');

async function loadEnv() {
  if (!process.env.ENV || process.env.ENV === '') {
    throw new Error("Missing 'ENV' variable to load the appropriate YaDU configuration");
  }

  if (process.platform === 'win32') {
    logDebug('Using Windows');
    if (process.env.comspec.includes('cmd.exe')) {
      logDebug(`${'[INFO]'.info} Modifying the 'comspec' environment variable to use : 'C:\\Program Files\\Git\\bin\\bash.exe'`);
      process.env.comspec = 'C:\\Program Files\\Git\\bin\\bash.exe';
    }
  } else {
    logDebug('Using Linux');
  }

  await loadArgs({ env: process.env.ENV }).catch((e) => {
    if (e && e.code === 'CredentialsError') {
      console.error('[Missing AWS Credentials]\nSolution:\nexport AWS_REGION=us-east-1\nexport AWS_PROFILE=default'.error);
      throw e;
    }
    if (process.env.FAIL_ON_LOAD === 'true') {
      throw e;
    } else {
      logDebug(`${'[WARN]'.warn} Failed to load the configuration`);
    }
  });

  logDebug('[YaDU] Environment variables loaded');
  // logDebug(process.env);
}

module.exports = {
  loadEnv,
};

// This script doesn't wait to resolve before loading the use-env script
// ENV=config-old node -r ./config.js __tests__/POC/use-env.spec.js
