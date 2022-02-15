const { logVerbose } = require('../../globals/utils');
const MysqlDump = require('../../mysqlDump/mysqldump');

module.exports = (args, config) => {
  if (!args.mysqldump) {
    return false;
  }
  console.log('> MySQL Dump');

  logVerbose(config);

  // Load options from yady config file and override if the argument is defined
  let options = config && config.mysqlDump ? config.mysqlDump.options : null;
  options = args && args.options ? args.options : options;
  let filename = config && config.mysqlDump ? config.mysqlDump.filename : null;
  filename = args && args.filename ? args.filename : filename;
  let executable = config && config.mysqlDump ? config.mysqlDump.executable : null;
  executable = args && args.executable ? args.executable : executable;

  logVerbose(options);

  const md = new MysqlDump({
    credentials: {
      dbName: process.env.DB_NAME,
      dbUrl: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    },
    executable,
    options,
    filename,
  });

  console.log('> Launch mysqldump');
  md.DumpDatabase();

  return true;
};
