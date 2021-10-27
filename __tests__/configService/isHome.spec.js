const path = require('path');
const { isHome } = require('../../libs/globals/utils');

describe('Check isHome vaue', () => {
  test('isHome from test directory', () => {
    const home = isHome(__dirname);
    expect(home.success).toBeTruthy();
    expect(home.path.split(path.sep).reverse()[0]).toBe('');
    expect(home.iter).toBe(2);
  });

  test('isHome from root', () => {
    const home = isHome(path.join(__dirname, '..', '..'));
    expect(home.success).toBeTruthy();
    expect(home.path.split(path.sep).reverse()[0]).toBe('');
    expect(home.iter).toBe(0);
  });
});
