const fs = require('fs');
const path = require('path');

const convert = require('xml-js');

function updateXML(name, migrationPath, basePath, main = 'db.changelog-main.xml') {
  const MAIN_PATH = path.resolve(basePath, main);

  const json = fs.readFileSync(MAIN_PATH, 'utf8');
  console.log(json);
  const converted = convert.xml2js(json, { compact: false, spaces: 4 });
  console.log(JSON.stringify(converted, null, 2));
  converted.elements[0].elements.push({
    type: 'element',
    name: 'include',
    attributes: {
      file: `${path.resolve(migrationPath)}${path.sep}${name}.mysql.sql`,
    },
  });

  const xml = convert.json2xml(converted, { compact: false, ignoreComment: true, spaces: 4 });
  fs.writeFileSync(MAIN_PATH, xml, { encoding: 'utf-8' });
}

function saveMainFile(content, basePath, main = 'db.changelog-main.xml') {
  const MAIN_PATH = path.resolve(basePath, main);

  const xml = convert.json2xml(content, { compact: false, ignoreComment: true, spaces: 4 });
  fs.writeFileSync(MAIN_PATH, xml, { encoding: 'utf-8' });
}

module.exports = {
  updateXML,
  saveMainFile,
};
