const shell = require('shelljs');
const path = require('path');
const { logDebug } = require('../../globals/utils');

module.exports = class MysqlDump {
  constructor(config = {}) {
    this.executable = config.executable || this.SetDefaultExecutable();
  }

  SetDefaultExecutable() {
    if (process.platform === 'win32') {
      logDebug(`Trying default executable : 'C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe'`);
      const slash = path.win32.sep;
      this.SetExecutable(`C:${slash}Program Files${slash}MySQL${slash}MySQL Workbench 8.0 CE${slash}mysqldump.exe`);
      return;
    }

    if (process.platform === 'linux') {
      logDebug("Trying default executable : 'mysqldump'");
      this.SetExecutable('mysqldump');
      return;
    }

    if (process.platform === 'darwin') {
      logDebug("Trying default executable : '/Applications/MySQLWorkbench.app/Contents/MacOS/mysqldump'");
      this.SetExecutable('/Applications/MySQLWorkbench.app/Contents/MacOS/mysqldump');
    }
  }

  CheckExecutable(exe) {
    const { stderr, stdout, code } = shell.exec(`${exe || this.executable} --help`);

    if (code !== 0 || stderr) {
      throw new Error(stderr || stdout);
    }

    return true;
  }

  SetExecutable(exe) {
    if (this.CheckExecutable(exe)) {
      this.executable = exe;
      return this.executable;
    }
  }
};
