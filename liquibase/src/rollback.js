const path = require('path');
const colors = require('colors');
const shell = require('shelljs');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

function rollback(liquibaseBasePath, liquibaseConfPath, basePath, classPath, name, tag, dryrun) {
  if (!process.env.DB_URL) {
    throw new Error('Missing database URL in the environment variables.');
  }

  if (dryrun === true) {
    console.log('DRY-RUN: Will print the SQL to be executed for this rollback'.debug);
    const { code, stderr, stdout } = shell.exec(
      `${liquibaseBasePath} \
        --changeLogFile='${path.join(basePath)}db.changelog-${name}.mysql.sql' \
        --url='${process.env.DB_URL}' \
        --classpath=${classPath} \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        rollbackSQL ${tag}`,
      { silent: !process.env.DEBUG },
    );

    if (code && code !== 0) {
      throw new Error(stderr || stdout.replace(/#.*\n/gm, ''));
    }

    console.log(stdout);
    console.log('DRY-RUN : Nothing has been executed.'.success);
    console.log("To execute the rollback command. Run the same command with '--no-dry-run'".action);

    return;
  }

  console.log(`Rollback '${process.env.DB_URL}' to '${tag}' using this migration '${name}' ...`.action);

  const { code, stderr, stdout } = shell.exec(
    `${liquibaseBasePath} \
        --changeLogFile='${path.join(basePath)}db.changelog-${name}.mysql.sql' \
        --url='${process.env.DB_URL}' \
        --classpath=${classPath} \
        --defaultsFile '${liquibaseConfPath}' \
        --username='${process.env.DB_USER}' \
        --password='${process.env.DB_PASS}' \
        --liquibaseHubApiKey='${process.env.API_KEY}' \
        --hubProjectId='${process.env.PROJECT_ID}' \
        rollback ${tag}`,
    { silent: !process.env.DEBUG },
  );

  if (code && code !== 0) {
    throw new Error(stderr || stdout.replace(/#.*\n/gm, ''));
  }

  console.log(stdout);
}

module.exports = {
  rollback,
};
