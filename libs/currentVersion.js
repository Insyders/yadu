const shell = require('shelljs');
const colors = require('colors');
const currentVersion = require('../package.json').version;
const { logDebug } = require('./globals/utils');

colors.setTheme({
  warn: 'yellow',
  debug: 'grey',
  error: 'red',
  info: 'cyan',
  success: ['green', 'underline'],
});

function CheckLocalVersion() {
  console.log('Check Local Toolkit Version...'.info);
  const { stdout, stderr, code } = shell.exec('npm show @halfserious/yadu version', { silent: !process.env.DEBUG });

  if (code !== 0) {
    logDebug(stderr);
    // throw new Error(stderr);
    console.log('Unable to check the version\n'.error);
    return false;
  }

  const latestVersion = stdout.replace(/\n/g, '');

  if (latestVersion.toString() !== currentVersion.toString()) {
    console.log('|----------------------------------------------------------------------------|'.error);
    console.log(`Your local version '${currentVersion}' is different than the server version '${latestVersion}'`.error);
    console.log('npm install -g @halfserious/yadu'.error);
    console.log('|----------------------------------------------------------------------------|\n'.error);
    return false;
  }
  console.log('Latest version is installed\n'.success);
  return true;
}

module.exports = { CheckLocalVersion };
