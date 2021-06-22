const shell = require('shelljs');
const path = require('path');
const { logDebug } = require('../../globals/utils');

module.exports = class MysqlDump {
  constructor(config = {}) {
    this.executable = config.executable || this.SetDefaultExecutable();
  }

  SetDefaultExecutable() {
    logDebug(`SetDefaultExecutable for ${process.platform}`);
    if (process.platform === 'win32') {
      const slash = path.win32.sep;
      logDebug(`Trying default executable : 'C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe'`);
      this.SetExecutable(`C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe`);
      return this.executable;
    }

    if (process.platform === 'linux') {
      logDebug("Trying default executable : 'mysqldump'");
      this.SetExecutable('mysqldump');
      return this.executable;
    }

    if (process.platform === 'darwin') {
      logDebug("Trying default executable : '/Applications/MySQLWorkbench.app/Contents/MacOS/mysqldump'");
      this.SetExecutable('/Applications/MySQLWorkbench.app/Contents/MacOS/mysqldump');
      return this.executable;
    }

    // By default:
    this.SetExecutable('mysqldump');
    return this.executable;
  }

  CheckExecutable(exe = null) {
    logDebug(`CheckExecutable - '${exe}' || '${this.executable}'`);
    if (!exe && !this.executable) {
      throw new Error('No executable defined.');
    }
    const { stderr, stdout, code } = shell.exec(`${exe || this.executable} --help`);

    if (code !== 0 || stderr) {
      console.error(stderr || stdout);
      return false;
    }

    return true;
  }

  SetExecutable(exe = null) {
    logDebug(`SetExecutable - '${exe}'`);
    if (this.CheckExecutable(exe)) {
      logDebug(`Set the executable to '${exe}'`);
      this.executable = exe;
      return this.executable;
    }
    throw new Error('Invalid executable path provided.');
  }
};
