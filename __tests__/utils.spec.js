const { defaultZip } = require('../lib/utils');

describe('Test Utils module', () => {
  test('defaultZip function', () => {
    const fileList = defaultZip(`${__dirname}/./test_data/_LAMBDA_/lambda_fn`);

    console.log(fileList);
    expect(fileList).toBeDefined();
    expect(fileList).toEqual('README.md index.js node_modules package.json src');
  });
});
