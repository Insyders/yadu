const AWS = require('aws-sdk');
const { logDebug } = require('../liquibase/src/utils');

async function getCreds(secretName) {
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

async function retrieveSecrets(secretKeys) {
  if (!secretKeys || secretKeys.split(',').length === 0) {
    console.log(`${'[WARN]'.warn} No secret key defined`);
    return Promise.resolve();
  }

  const items = secretKeys.split(',');
  console.log(`${items.length} secret(s) will be retrieved`.debug);
  for await (const secretKey of items) {
    // eslint-disable-next-line max-len
    console.log(
      `Retrieving secret(s) for '${secretKey}' using '${process.env.AWS_PROFILE}' profile in '${process.env.AWS_REGION}' region.`.debug,
    );

    const secret = await getCreds(secretKey);

    logDebug(`Secret ${secretKey}  retrieved:'`);

    const secretParsed = JSON.parse(secret);

    Object.keys(secretParsed).forEach((key) => {
      logDebug(`Adding ${key} to your environment variables.`);
      process.env[key] = secretParsed[key];
    });

    console.log(`'${secretKey}' secret(s) retrieved successfully.`.success);
  }
}

module.exports = {
  getCreds,
  retrieveSecrets,
};
