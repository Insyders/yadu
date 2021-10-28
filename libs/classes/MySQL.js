const mysql = require('mysql');
const { logDebug } = require('../globals/utils');

class MySql {
  constructor(config = {}) {
    this.config = {
      mySqlHost: config.mySqlHost,
      mySqlUser: config.mySqlUser,
      mySqlPassword: config.mySqlPassword,
      mySqlDatabase: config.mySqlDatabase,
      mySqlPort: config.mySqlPort,
    };

    this.charset = 'utf8mb4';
    this.multipleStatements = true;
  }

  connectMySql(config, noDB = false) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Action] Trying to create a connection to the database (${config.mySqlHost})`);
        const conn = mysql.createConnection({
          host: config.mySqlHost,
          user: config.mySqlUser,
          password: config.mySqlPassword,
          database: noDB === false ? config.mySqlDatabase : null,
          port: config.mySqlPort,
          charset: this.charset,
          multipleStatements: this.multipleStatements,
        });

        conn.connect((err) => {
          if (err) {
            logDebug(`ConnectMysql - Catched an Error - ${err.message}`);
            return reject(err);
          }
          console.log(`${`Connected`.success} to ${config.mySqlHost}`);
          return resolve(conn);
        });
      } catch (e) {
        console.error('Be sure to use the appropriate JSON configuration'.error);
        console.error(`Error: ${e.message}`.error);
        logDebug(`ConnectMysql - ${e.message}`);
        return reject(e.message);
      }
    });
  }

  async checkConnection(config) {
    const conn = await this.connectMySql(config || this.config);

    logDebug(`ID: ${conn.threadId}`);
    conn.end();
    return conn.threadId;
  }
}

module.exports = MySql;
