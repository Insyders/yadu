const ConfigService = require('../../lib/classes/Config');

describe('Test config service methods', () => {
  test('create config', () => {
    const config = ConfigService.LoadConfig('./yadu.json');

    expect(typeof config).toBe('object');
  });
});
