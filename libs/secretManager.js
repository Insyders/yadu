const AWS = require('aws-sdk');
const colors = require('colors');
const { logDebug } = require('./globals/utils');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  debug: 'grey',
  verbose: 'magenta',
  info: 'blue',
  success: ['green'],
  action: 'cyan',
});

async function getCreds(secretName) {
  logDebug('[Action] Get Creds');
  // Create a Secrets Manager client
  const client = new AWS.SecretsManager();

  let secret = null;

  const data = await client
    .getSecretValue({ SecretId: secretName })
    .promise()
    .catch((err) => {
      if (err.code === 'DecryptionFailureException') {
        throw err;
      } else if (err.code === 'InternalServiceErrorException') {
        throw err;
      } else if (err.code === 'InvalidParameterException') {
        throw err;
      } else if (err.code === 'InvalidRequestException') {
        throw err;
      } else if (err.code === 'ResourceNotFoundException') {
        throw err;
      } else {
        throw err;
      }
    });

  if (data) {
    if ('SecretString' in data) {
      secret = data.SecretString;
    }
  }

  return Promise.resolve(secret);
}

/**
 * Assign Secrets Manager values to environment variables using a custom mapping
 * @param {*} hasSuffix
 * @param {*} key
 * @param {*} secretParsed
 * @param {*} secretKey
 */
function assignSecretValues(hasSuffix, key, secretParsed, secretKey) {
  logDebug('[Action] Assign Secrets Values to environment variables');
  const tKey = hasSuffix ? `${key.toUpperCase()}_${secretKey.split(':')[1].toUpperCase()}` : key;

  logDebug(`Adding ${tKey} to your environment variables.`);
  process.env[tKey] = secretParsed[tKey];

  // RDS Secret Manager when using the Cloudformation
  if (key === 'username') {
    process.env[`DB_USER${hasSuffix ? `_${secretKey.split(':')[1].toUpperCase()}` : ''}`] = secretParsed[key];
  }
  if (key === 'password') {
    process.env[`DB_PASS${hasSuffix ? `_${secretKey.split(':')[1].toUpperCase()}` : ''}`] = secretParsed[key];
  }
  if (key === 'port') {
    process.env[`DB_PORT${hasSuffix ? `_${secretKey.split(':')[1].toUpperCase()}` : ''}`] = secretParsed[key];
  }
  if (key === 'dbInstanceIdentifier') {
    process.env[`DB_NAME${hasSuffix ? `_${secretKey.split(':')[1].toUpperCase()}` : ''}`] = secretParsed[key];
  }
  if (key === 'host') {
    process.env[`DB_URL${hasSuffix ? `_${secretKey.split(':')[1].toUpperCase()}` : ''}`] = secretParsed[key];
  }
}

async function retrieveSecrets(secretKeys) {
  console.log('[Action] Retrive Secrets from AWS Secrets Manager');
  if (!secretKeys || secretKeys.split(',').length === 0) {
    console.log(`${'[INFO]'.info} No secret key defined`);
    return Promise.resolve();
  }

  const items = secretKeys.split(',');
  console.log(`${items.length} secret(s) will be retrieved`.action);

  for await (const secretKey of items) {
    let hasSuffix = false;
    // eslint-disable-next-line max-len
    console.log(
      `Retrieving secret(s) for '${secretKey}' using '${process.env.AWS_PROFILE}' profile in '${process.env.AWS_REGION}' region.`.action,
    );
    if (secretKey.includes(':')) {
      logDebug('secretKey contains a suffix');
      hasSuffix = true;
    }

    const secret = await getCreds(secretKey.split(':')[0]);

    logDebug(`Secret ${secretKey}  retrieved:'`);

    const secretParsed = JSON.parse(secret);

    Object.keys(secretParsed).forEach((key) => {
      assignSecretValues(hasSuffix, key, secretParsed, secretKey);
    });

    console.log(`${'[SUCCESS]'.success}' ${secretKey}' secret(s) retrieved successfully.`);
  }
}

module.exports = {
  getCreds,
  retrieveSecrets,
  assignSecretValues,
};
