const { defaultZip } = require('../libs/utils');

describe('Test Utils module', () => {
  test('defaultZip function', () => {
    const fileList = defaultZip(`${__dirname}/./test_data/_LAMBDA_/lambda_fn`);

    console.log(fileList);
    expect(fileList).toBeDefined();
    expect(fileList).toEqual('README.md index.js package-lock.json package.json src');
  });
});
