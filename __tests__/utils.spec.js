const shell = require('shelljs');
const { defaultZip } = require('../libs/utils');

describe('Test Utils module', () => {
  test('defaultZip function', () => {
    shell.cd(`${__dirname}/./test_data/_LAMBDA_/lambda_fn`);
    shell.exec('npm install');
    const fileList = defaultZip(`${__dirname}/./test_data/_LAMBDA_/lambda_fn`);

    console.log(fileList);
    expect(fileList).toBeDefined();
    expect(fileList).toEqual('README.md index.js node_modules package.json package-lock.json src');
  });
});
