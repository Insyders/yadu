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
    console.log(`${'[INFO]'.info} No secret key defined`);
    return Promise.resolve();
  }

  const items = secretKeys.split(',');
  console.log(`${items.length} secret(s) will be retrieved`.debug);

  for await (const secretKey of items) {
    let hasSuffix = false;
    let databasePort;
    let databaseName;
    let databaseHost;
    // eslint-disable-next-line max-len
    console.log(
      `Retrieving secret(s) for '${secretKey}' using '${process.env.AWS_PROFILE}' profile in '${process.env.AWS_REGION}' region.`.debug,
    );
    if (secretKey.includes(':')) {
      console.debug('secretKey contains a suffix');
      hasSuffix = true;
    }

    const secret = await getCreds(secretKey.split(':')[0]);

    logDebug(`Secret ${secretKey}  retrieved:'`);

    const secretParsed = JSON.parse(secret);

    Object.keys(secretParsed).forEach((key) => {
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
        databasePort = secretParsed[key];
      }
      if (key === 'dbInstanceIdentifier') {
        databaseName = secretParsed[key];
      }
      if (key === 'host') {
        databaseHost = secretParsed[key];
      }
    });

    if (databasePort && databaseName) {
      process.env[
        `DB_URL${hasSuffix ? `_${secretKey.split(':')[1].toUpperCase()}` : ''}`
      ] = `jdbc:mysql://${databaseHost}:${databasePort}/${databaseName}?useUnicode=true&characterEncoding=UTF-8`;
    }

    console.log(`'${secretKey}' secret(s) retrieved successfully.`.success);
  }
}

module.exports = {
  getCreds,
  retrieveSecrets,
};
