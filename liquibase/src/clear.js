const path = require('path');
const colors = require('colors');
const shell = require('shelljs');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

function clearCheckSums(liquibaseBasePath, liquibaseConfPath, basePath, classPath, main = 'db.changelog-main.xml') {
  if (!process.env.DB_URL) {
    throw new Error('Missing database URL in the environment variables.');
  }
  console.log(`Clearing all checksums for '${process.env.DB_URL}' ...`.action);

  const { code, stderr, stdout } = shell.exec(
    `${liquibaseBasePath} \
        --changeLogFile='${path.join(basePath) + main}' \
        --classpath=${classPath} \
        --url='${process.env.DB_URL}' \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        clearCheckSums`,
    { silent: !process.env.debug },
  );

  if (code && code !== 0) {
    throw new Error(stderr || stdout);
  }

  console.log(stdout);
}

module.exports = {
  clearCheckSums,
};
