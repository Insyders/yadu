const mysql = require('mysql');
const util = require('util');
const { logDebug } = require('../globals/utils');

class MySql {
  constructor(config = {}) {
    this.config = {
      mySqlHost: config.mySqlHost,
      mySqlUser: config.mySqlUser,
      mySqlPassword: config.mySqlPassword,
      mySqlDatabase: config.mySqlDatabase || null,
      mySqlPort: config.mySqlPort,
    };

    this.charset = 'utf8mb4';
    this.multipleStatements = true;

    this.conn = null;
  }

  closeConnection() {
    if (this.conn && this.conn.threadId) {
      this.conn.end();
      this.conn = null;
    }
  }

  connectMySql(config, noDB = false) {
    return new Promise((resolve) => {
      try {
        if (this.conn && this.conn.threadId) {
          console.debug(`Reusing existing connection. (${this.conn.threadId})`);
          return resolve(this.conn);
        }
        if (!this.config && !config) {
          throw new Error('Missing Configuration, unable to connect.');
        }

        // FIXME: fix this implementation when the time allows it.
        // eslint-disable-next-line no-underscore-dangle
        const _config = config || this.config;

        console.log(`[Action] Trying to create a connection to the database (${_config.mySqlHost})`);
        const conn = mysql.createConnection({
          host: _config.mySqlHost,
          user: _config.mySqlUser,
          password: _config.mySqlPassword,
          database: noDB === false ? _config.mySqlDatabase : null,
          port: _config.mySqlPort,
          charset: this.charset,
          multipleStatements: this.multipleStatements,
        });

        conn.connect((err) => {
          if (err) {
            logDebug(`ConnectMysql - Catched an Error - ${err.message}`);
            throw err;
          }
          console.log(`${`Connected`.success} to ${_config.mySqlHost}`);
          this.conn = conn;
          return resolve(conn);
        });
      } catch (e) {
        console.error('Be sure to use the appropriate JSON configuration'.error);
        console.error(`Error: ${e.message}`.error);
        logDebug(`ConnectMysql - ${e.message}`);
        throw new Error(e.message);
      }
    });
  }

  async checkConnection(config) {
    console.log('Check Connection');
    const conn = await this.connectMySql(config || this.config);

    logDebug(`ID: ${conn.threadId}`);
    conn.end();
    return conn.threadId;
  }

  async createDatabase(dbInfo) {
    try {
      console.log('createDatabase');
      if (!dbInfo || !dbInfo.name) {
        throw new Error('Invalid DB Info');
      }
      await this.connectMySql(this.config, true);
      const query = util.promisify(this.conn.query).bind(this.conn);

      await query(`CREATE DATABASE \`${dbInfo.name}\`;`);
      this.closeConnection();

      console.log(`${`Database`.success} ${dbInfo.name} created on ${this.config.mySqlHost}`);
      return Promise.resolve(dbInfo.name);
    } catch (e) {
      console.error(e);
      this.closeConnection();
      throw e;
    }
  }

  async createUser(credentials) {
    try {
      console.log('createUser');
      if (!credentials || !credentials.username || !credentials.password || !credentials.dbName) {
        throw new Error('Invalid Credentials');
      }

      await this.connectMySql(this.config, true);
      const query = util.promisify(this.conn.query).bind(this.conn);

      await query(`CREATE USER \`${credentials.username}\`@'%' IDENTIFIED BY '${credentials.password}';`).catch((e) => {
        throw e;
      });
      await query(`GRANT ALL PRIVILEGES ON \`${credentials.dbName}\`.* TO \`${credentials.username}\`@'%';`).catch((e) => {
        throw e;
      });
      this.closeConnection();
      console.log(`${`User`.success} ${credentials.username} created on ${this.config.mySqlHost}`);

      return Promise.resolve(credentials.username);
    } catch (e) {
      console.error(e);
      this.closeConnection();
      throw e;
    }
  }
}
module.exports = MySql;
