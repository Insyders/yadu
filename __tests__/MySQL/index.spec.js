const colors = require('colors');
const MySql = require('../../libs/classes/MySQL');

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

describe('Test MySQL Connection', () => {
  test.skip('Check Connection', async () => {
    const conn = new MySql();

    const connId = await conn.checkConnection({
      mySqlHost: process.env.DB_HOST,
      mySqlUser: process.env.DB_USER,
      mySqlPassword: process.env.DB_PASSWORD,
      mySqlDatabase: process.env.DB_DATABASE,
      mySqlPort: process.env.DB_PORT,
    });

    expect(connId.toString()).toMatch(/[0-9]*/);
  });
});
