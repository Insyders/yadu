const fs = require('fs');
const path = require('path');

class Config {
  constructor(config) {
    this.config = {};
    Object.keys(config).forEach((key) => {
      this.config[key] = config[key];
    });
    // Override with default values if any
    this.config.debug = config.debug === true;
    this.config.region = config.region || 'us-east-1';
    this.config.layerVersion = config.layerVersion || null;
    this.config.accountId = config.accountId || '';
    this.config.lambdaBasePath = config.lambdaBasePath || './';
    this.config.stage = config.stage || '';
    this.config.mapping = config.mapping || {};
    this.config.secrets = config.secrets || '';
    this.config.mysqlBasePath = config.mysqlBasePath || null;
    this.config.liquibaseBasePath = config.liquibaseBasePath || null;
    this.config.liquibaseConfPath = config.liquibaseConfPath || null;
    this.config.classPath = config.classPath || null;
    this.config.applicationYaml = config.applicationYaml || './';
    this.config.zipArgs = config.zipArgs || '';
  }

  static LoadConfig(configPath) {
    console.log(`[LoadConfig] using '${configPath}'`);
    try {
      let config = fs.readFileSync(path.resolve(configPath));

      config = JSON.parse(config);
      const instance = new Config(config);
      instance.MapConfig();

      return instance.GetConfig();
    } catch (e) {
      console.log(`${'[ERROR]'.error} LoadConfig : ${e.message}`);
      return null;
    }
  }

  static CreateConfig(destination, config) {
    console.log(`[CreateConfig] Create configuration to ${destination}`);
    try {
      const configInstance = new Config(config);
      configInstance.SaveConfig(destination);
    } catch (e) {
      console.log(`${'[ERROR]'.error} CreateConfig : ${e.message}`);
      throw e;
    }
  }

  MapConfig() {
    process.env.SECRETS = this.config.secrets;
    process.env.BASE_PATH = this.config.mysqlBasePath;

    if (this.config.classPath) {
      process.env.CLASS_PATH = this.config.classPath;
    }
    if (this.config.liquibaseBasePath) {
      process.env.LIQUIBASE_BASE_PATH = this.config.liquibaseBasePath;
    }
    if (this.config.liquibaseConfPath) {
      process.env.LIQUIBASE_CONF_PATH = this.config.liquibaseConfPath;
    }

    process.env.DEBUG = !!this.config.debug;
    process.env.AWS_REGION = this.config.region;
    process.env.LAYER_VERSION = this.config.layerVersion;
    process.env.ACCOUNT_ID = this.config.accountId;
  }

  SaveConfig(destination) {
    console.log(`[SaveConfig] to '${destination}'`);
    const dirName = `${path.resolve(destination) + path.sep}.yadu${path.sep}`;
    try {
      console.log(`[SaveConfig] make directory '${dirName}'`);
      fs.mkdirSync(dirName);
    } catch (e) {
      if (e.code !== 'EEXIST') {
        console.log(`${'[ERROR]'.error} SaveConfig : ${e.message}`);
        throw e;
      }
    }
    const saveDestination = `${dirName + (this.config.stage && this.config.stage !== '' ? this.config.stage : 'config')}.json`;
    console.log(saveDestination);
    fs.writeFileSync(saveDestination, JSON.stringify(this.config, null, 2));

    console.log(`[SaveConfig] saved to '${saveDestination}'`);
  }

  GetConfig() {
    console.log(`[GetConfig]`);
    return this.config;
  }

  SetConfig(config) {
    console.log(`[SetConfig]`);
    this.config = config;
  }
}

module.exports = Config;
