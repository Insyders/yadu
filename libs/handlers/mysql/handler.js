const { logVerbose } = require('../../globals/utils');
const MysqlDump = require('../../mysqlDump/mysqldump');

module.exports = (args, config) => {
  if (!args.mysqldump) {
    return false;
  }
  console.log('> MySQL Dump');

  logVerbose(config);

  // Load options from yady config file and override is the argument is defined
  let options = config && config.mysqlDump ? config.mysqlDump.options : null;
  options = args && args.options ? args.options : options;

  logVerbose(options);

  const md = new MysqlDump({
    executable: config && config.mysqlDump ? config.mysqlDump.executable : null,
    credentials: {
      dbName: process.env.DB_NAME,
      dbUrl: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    },
    options,
    filename: config && config.mysqlDump ? config.mysqlDump.filename : null,
  });

  console.log('> Launch mysqldump');
  md.DumpDatabase();

  return true;
};
