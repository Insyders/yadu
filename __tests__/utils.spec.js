const { defaultZip } = require('../lib/utils');

describe('Test Utils module', () => {
  test('defaultZip function', () => {
    defaultZip(`${__dirname}/./test_data/_LAMBDA_/lambda_fn`);
  });
});
