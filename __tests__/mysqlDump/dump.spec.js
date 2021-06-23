const path = require('path');
const MysqlDump = require('../../mysqlDump/mysqldump');

describe('Test mysqlDump', () => {
  test('Should find the appropriate executable path', () => {
    const mysql = new MysqlDump();

    expect(mysql.CheckExecutable()).toBeTruthy();
  });

  test('Simulate windows path', () => {
    const slash = path.win32.sep;
    const executable = `C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe`;

    expect(executable).toBe('C:\\Program Files\\MySQL\\MySQL Workbench 8.0 CE\\mysqldump.exe');
  });

  test('mysqlDump inexistant DB', () => {
    const mysql = new MysqlDump({
      credentials: {
        user: 'test',
        password: 'test',
        dbName: 'test',
        dbUrl: 'localhost',
      },
    });

    expect(() => {
      mysql.DumpDatabase();
    }).toThrow(`mysqldump: [Warning] Using a password on the command line interface can be insecure.
mysqldump: Got error: 2002: Can't connect to local MySQL server through socket '/tmp/mysql.sock' (2) when trying to connect`);
  });
});
