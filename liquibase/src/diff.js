const colors = require('colors');
const shell = require('shelljs');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

function diff(liquibaseBasePath, liquibaseConfPath, classPath) {
  if (!process.env.DB_URL || !process.env.DB_URL_REF) {
    throw new Error('Missing database URL in the environment variables.');
  }
  console.log(`Comparing '${process.env.DB_URL}' with '${process.env.DB_URL_REF}' ...`.action);

  const { code, stderr, stdout } = shell.exec(
    `${liquibaseBasePath} \
        --url='${process.env.DB_URL}' \
        --classpath=${classPath} \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --referenceUrl="${process.env.DB_URL_REF}" \
        --referenceUsername='${process.env.DB_USER_REF}' \
        --referencePassword='${process.env.DB_PASS_REF}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        diff`,
    { silent: process.env.DEBUG === 'false' },
  );

  if (code && code !== 0) {
    throw new Error(stderr || stdout.replace(/#.*\n/gm, ''));
  }

  console.log(stdout);
}

module.exports = {
  diff,
};
