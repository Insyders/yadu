const { logVerbose } = require('../globals/utils');
const MysqlDump = require('./mysqldump');

module.exports = (args, config) => {
  console.log('> MySQL Dump');
  if (!args.mysqldump) {
    return false;
  }

  logVerbose(config);

  const md = new MysqlDump({
    executable: config && config.mysqlDump ? config.mysqlDump.executable : null,
    credentials: {
      dbName: process.env.DB_NAME,
      dbUrl: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
    },
    options: config && config.mysqlDump ? config.mysqlDump.options : null,
    filename: config && config.mysqlDump ? config.mysqlDump.filename : null,
  });

  console.log('> Launch mysqldump');
  md.DumpDatabase();

  return true;
};
