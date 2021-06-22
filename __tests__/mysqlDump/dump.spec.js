const path = require('path');
const MysqlDump = require('../../liquibase/src/mysqldump');

describe('Test mysqlDump', () => {
  test('Should find the appropriate executable path', () => {
    const mysql = new MysqlDump();

    console.log(mysql);

    expect(mysql.CheckExecutable()).toBeTruthy();
  });

  test('Simulate windows path', () => {
    const slash = path.win32.sep;
    const executable = `C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe`;

    expect(executable).toBe('C:\\Program Files\\MySQL\\MySQL Workbench 8.0 CE\\mysqldump.exe');
  });
});
