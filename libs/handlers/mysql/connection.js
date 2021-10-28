const { logVerbose, logDebug } = require('../../globals/utils');
const Mysql = require('../../classes/MySQL');

module.exports = async (args, config) => {
  logVerbose(config);
  if (args['test-db-connection']) {
    let primary = false;
    let secondary = false;

    console.log('[ACTION] Trying to Test DB Connection');
    if (process.env.DB_PORT && process.env.DB_NAME && process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASS) {
      console.log(`Testing Primary Database: ${process.env.DB_HOST}\n`);
      const client = new Mysql({
        mySqlHost: process.env.DB_HOST,
        mySqlUser: process.env.DB_USER,
        mySqlPassword: process.env.DB_PASS,
        mySqlDatabase: process.env.DB_NAME,
        mySqlPort: process.env.DB_PORT,
      });

      const id = await client.checkConnection();
      primary = true;
      logDebug(id);
      console.log('---\n');
    } else {
      throw new Error(
        `Missing Environment Variables for primary database:\n${
          process.env.DB_HOST && process.env.DB_HOST === '' ? `Missing ${'DB_HOST\n'.warn}` : `Provided ${'DB_HOST\n'.success}`
        }${process.env.DB_USER && process.env.DB_USER === '' ? `Missing ${'DB_USER\n'.warn}` : `Provided ${'DB_USER\n'.success}`}${
          process.env.DB_PASS && process.env.DB_PASS === '' ? `Missing ${'DB_PASS\n'.warn}` : `Provided ${'DB_PASS\n'.success}`
        }${process.env.DB_NAME && process.env.DB_NAME === '' ? `Missing ${'DB_NAME\n'.warn}` : `Provided ${'DB_NAME\n'.success}`}${
          process.env.DB_PORT && process.env.DB_PORT === '' ? `Missing ${'DB_PORT\n'.warn}` : `Provided ${'DB_PORT\n'.success}`
        }`,
      );
    }
    // This one is optional and will be tested only if defined
    if (
      process.env.DB_PORT_REF &&
      process.env.DB_NAME_REF &&
      process.env.DB_HOST_REF &&
      process.env.DB_USER_REF &&
      process.env.DB_PASS_REF
    ) {
      console.log(`Testing Reference Database: ${process.env.DB_HOST_REF}`);
      const clientRef = new Mysql({
        mySqlHost: process.env.DB_HOST_REF,
        mySqlUser: process.env.DB_USER_REF,
        mySqlPassword: process.env.DB_PASS_REF,
        mySqlDatabase: process.env.DB_NAME_REF,
        mySqlPort: process.env.DB_PORT_REF,
      });

      const idRef = await clientRef.checkConnection();
      secondary = true;
      logDebug(idRef);
    } else {
      console.log(
        `${'[WARN]'.warn} Missing Environment Variables for reference database:\n${
          process.env.DB_HOST_REF && process.env.DB_HOST_REF === ''
            ? `Missing ${'DB_HOST_REF\n'.warn}`
            : `Provided ${'DB_HOST_REF\n'.success}`
        }${
          process.env.DB_USER_REF && process.env.DB_USER_REF === ''
            ? `Missing ${'DB_USER_REF\n'.warn}`
            : `Provided ${'DB_USER_REF\n'.success}`
        }${
          process.env.DB_PASS_REF && process.env.DB_PASS_REF === ''
            ? `Missing ${'DB_PASS_REF\n'.warn}`
            : `Provided ${'DB_PASS_REF\n'.success}`
        }${
          process.env.DB_NAME_REF && process.env.DB_NAME_REF === ''
            ? `Missing ${'DB_NAME_REF\n'.warn}`
            : `Provided ${'DB_NAME_REF\n'.success}`
        }${
          process.env.DB_PORT_REF && process.env.DB_PORT_REF === ''
            ? `Missing ${'DB_PORT_REF\n'.warn}`
            : `Provided ${'DB_PORT_REF\n'.success}`
        }`,
      );
    }

    console.log('\nStatus:');
    console.log(`Primary Database : ${primary ? 'Connected!'.success : 'fail'.error}`);
    console.log(`Secondary Database : ${secondary ? 'Connected!'.success : 'fail (ignore if not provided)'.warn}`);
    return true;
  }

  return false;
};
