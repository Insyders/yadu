const { logVerbose } = require('../../globals/utils');
const Mysql = require('../../classes/MySQL');

module.exports = async (args, config) => {
  logVerbose(config);
  if (args['init-env']) {
    console.log('[ACTION] Initialize new database and user in an existing instance');
    if (process.env.DB_PORT && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS) {
      const client = new Mysql({
        mySqlHost: process.env.DB_HOST,
        mySqlUser: process.env.DB_USER,
        mySqlPassword: process.env.DB_PASS,
        mySqlPort: process.env.DB_PORT,
      });

      if (!process.env.DB_USER_PASS) {
        throw new Error('Missing password for the new user.');
      }

      await client.createDatabase({ name: process.env.DB_NAME });
      await client.createUser({
        username: process.env.DB_NAME,
        password: process.env.DB_USER_PASS,
        dbName: process.env.DB_NAME,
      });

      console.log('---\n');
    } else {
      throw new Error(
        `Missing Environment Variables for primary database:\n${
          !process.env.DB_HOST ? `Missing ${'DB_HOST\n'.warn}` : `Provided ${'DB_HOST\n'.success}`
        }${!process.env.DB_USER ? `Missing ${'DB_USER\n'.warn}` : `Provided ${'DB_USER\n'.success}`}${
          !process.env.DB_PASS ? `Missing ${'DB_PASS\n'.warn}` : `Provided ${'DB_PASS\n'.success}`
        }${!process.env.DB_NAME ? `Missing ${'DB_NAME\n'.warn}` : `Provided ${'DB_NAME\n'.success}`}${
          !process.env.DB_PORT ? `Missing ${'DB_PORT\n'.warn}` : `Provided ${'DB_PORT\n'.success}`
        }`,
      );
    }

    return true;
  }

  return false;
};
