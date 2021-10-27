const MysqlDump = require('../../libs/mysqlDump/mysqldump');

describe('Test mysqlDump', () => {
  test('Should find the appropriate executable path', () => {
    const mysql = new MysqlDump();

    expect(mysql.CheckExecutable()).toBeTruthy();
  });

  test('Simulate windows path', () => {
    const slash = '\\\\';
    const executable = `'C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe'`;

    expect(executable).toBe("'C:\\\\Program Files\\\\MySQL\\\\MySQL Workbench 8.0 CE\\\\mysqldump.exe'");
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
    }).toThrow();
  });
});
