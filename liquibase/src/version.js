// TODO: UPDATE THIS FILE TO USE MYSQLDUMP
const path = require('path');
const colors = require('colors');
const shell = require('shelljs');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

function createVersion(version, liquibaseBasePath, liquibaseConfPath, basePath, classPath) {
  let response = null;

  console.log(`generating changelog and save it to 'db.changelog-${version}.mysql.sql'`.action);

  response = shell.exec(
    `${liquibaseBasePath} \
    --changeLogFile='${path.join(basePath)}db.changelog-${version}.mysql.sql' \
    --url='${process.env.DB_URL}' \
    --classpath=${classPath} \
    --defaultsFile '${liquibaseConfPath}' \
    --username='${process.env.DB_USER}' \
    --password='${process.env.DB_PASS}' \
    --liquibaseHubApiKey='${process.env.API_KEY}' \
    --hubProjectId='${process.env.PROJECT_ID}' \
    generateChangeLog`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (response && response.code !== 0) {
    throw new Error(response.stderr || response.stdout);
  }

  console.log('Succesfully save current database state'.success);
}

module.exports = {
  createVersion,
};
