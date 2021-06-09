const path = require('path');
const colors = require('colors');
const { saveMainFile } = require('./xml');
const { getAllHistory, getLocalMigration, compare } = require('./utils');
const { base } = require('../lib/mainXML');
const { logDebug } = require('../../globals/utils');

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  success: ['green'],
  action: 'cyan',
});

async function generateMainFile(liquibaseBasePath, liquibaseConfPath, basePath, classPath) {
  const databaseToCompare = process.env.DB_URL_REF || process.env.DB_URL;
  const { historyData } = await getAllHistory(liquibaseBasePath, liquibaseConfPath, classPath, databaseToCompare);
  const localDirectory = getLocalMigration(basePath);

  const { valid, warn, count } = compare(localDirectory, historyData);

  console.log(`Will add ${count} file(s) to the '${path.resolve(basePath, 'db.changelog-main.xml')}'`.action);
  valid.forEach((v) => {
    console.log(`WILL BE ADDED: ${v}`.success);
  });
  warn.forEach((w) => {
    console.log(`WARN: ${w}`.warn);
  });

  const baseMain = { ...base };
  valid.forEach((file) => {
    logDebug(file);
    const element = {
      type: 'element',
      name: 'include',
      attributes: {
        file: `mysql/changelog/${file}`,
      },
    };

    baseMain.elements[0].elements.push(element);
  });

  saveMainFile(baseMain, basePath);
  console.log('Main File Saved !'.success);
}

module.exports = {
  generateMainFile,
};
