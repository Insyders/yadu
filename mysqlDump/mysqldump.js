const shell = require('shelljs');
const path = require('path');
const { logDebug, logVerbose } = require('../globals/utils');

module.exports = class MysqlDump {
  constructor(config = {}) {
    this.executable = config.executable || this.SetDefaultExecutable();
    this.options = config.options
      ? config.options.split(',')
      : ['no-data', 'all-databases', 'triggers', 'routines', 'events', 'column-statistics=0'];

    this.credentials = config.credentials;
    this.filename = config.filename || `schema-${new Date().toLocaleDateString().replace(/\//g, '-')}.sql`;
  }

  SetDefaultExecutable() {
    logDebug(`[SetDefaultExecutable] for ${process.platform}`);
    if (process.platform === 'win32') {
      // Requires \\
      const slash = '\\\\';
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
    logDebug(`[CheckExecutable] - '${exe}' || '${this.executable}'`);
    if (!exe && !this.executable) {
      throw new Error('No executable defined.');
    }
    const { stderr, stdout, code } = shell.exec(`${exe || this.executable} --help`, { silent: process.env.DEBUG !== 'true' });

    if (code !== 0 || stderr) {
      console.error(stderr || stdout);
      return false;
    }

    return true;
  }

  SetExecutable(exe = null) {
    logDebug(`[SetExecutable] - '${exe}'`);
    if (this.CheckExecutable(exe)) {
      logDebug(`Set the executable to '${exe}'`);
      this.executable = exe;
      return this.executable;
    }
    throw new Error('Invalid executable path provided.');
  }

  DumpDatabase() {
    logDebug('[DumpDatabse]');
    if (!this.credentials) {
      throw new Error('Missing database credentials');
    }

    logVerbose(this.credentials);
    let opts = '';
    this.options.forEach((opt) => {
      opts += `--${opt} `;
    });

    // FIXME: implement a secure way to do that
    const cmd = `${this.executable} \
    -h ${this.credentials.dbUrl} \
    -u ${this.credentials.user} \
    --password="${this.credentials.password}" \
    ${opts} \
    > ${this.filename}`;

    logVerbose(cmd);

    const { code, stderr, stdout } = shell.exec(cmd, { silent: process.env.DEBUG !== 'true' });

    if (code !== 0 || stderr) {
      // It uses 2 because there is an empty enter...
      if (stderr.includes('mysqldump: [Warning]') && stderr.split('\n').length === 2) {
        console.log(`${['WARN'.warn]} ${stderr || stdout}`);
        // FIXME: might cause side effects..
        return true;
      }
      logDebug(`ERROR in DumpDatabase Function : ${stderr || stdout}`);
      throw new Error(stderr || stdout);
    }

    logDebug(stdout);
    return true;
  }
};
