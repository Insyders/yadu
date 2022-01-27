require('dotenv').config({
  path: `${__dirname}/../../.env.db`,
});
const colors = require('colors');
const util = require('util');

const Mysql = require('../../libs/classes/MySQL');

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

describe('Test Initialization of a new environment', () => {
  test.skip('Check Connection', async () => {
    const client = new Mysql({
      mySqlHost: process.env.DB_HOST,
      mySqlUser: process.env.DB_USER,
      mySqlPassword: process.env.DB_PASS,
      mySqlPort: process.env.DB_PORT,
    });

    await client.checkConnection();
  });

  test.skip('Should create a new database with user and password', async () => {
    const client = new Mysql({
      mySqlHost: process.env.DB_HOST,
      mySqlUser: process.env.DB_USER,
      mySqlPassword: process.env.DB_PASS,
      mySqlPort: process.env.DB_PORT,
    });

    const i = await client.createDatabase({ name: process.env.DB_NAME }).catch((e) => {
      throw e;
    });
    const u = await client
      .createUser({ username: process.env.DB_NAME, password: process.env.USER_PASSWORD, dbName: process.env.DB_NAME })
      .catch((e) => {
        throw e;
      });

    expect(i).toBeDefined();
    expect(i).toEqual(process.env.DB_NAME);

    expect(u).toBeDefined();
    expect(u).toEqual(process.env.DB_NAME);
  });

  test.skip('Validate connection information', async () => {
    const client = new Mysql({
      mySqlHost: process.env.DB_HOST,
      mySqlUser: process.env.DB_NAME,
      mySqlPassword: process.env.USER_PASSWORD,
      mySqlPort: process.env.DB_PORT,
      mySqlDatabase: process.env.DB_NAME,
    });

    const validated = await client.checkConnection();
    expect(validated).toBeDefined();
  });

  test.skip('Testing call when using dash', async () => {
    let client = null;
    try {
      client = new Mysql({
        mySqlHost: process.env.DB_HOST,
        mySqlUser: process.env.DB_NAME,
        mySqlPassword: process.env.USER_PASSWORD,
        mySqlPort: process.env.DB_PORT,
        mySqlDatabase: process.env.DB_NAME,
      });

      await client.connectMySql();
      const query = util.promisify(client.conn.query).bind(client.conn);

      const results = await query('show tables');
      const p = await query('select * from Persons;');
      client.closeConnection();
      console.debug(p);
      expect(results).toBeDefined();
      expect(client.conn).toBe(null);
    } catch (e) {
      if (client) {
        client.closeConnection();
      }
      throw e;
    }
  });
});
