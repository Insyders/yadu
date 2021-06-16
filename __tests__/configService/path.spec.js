describe('Simulate path', () => {
  test('#1', () => {
    // const configPath = process.cwd().split(path.sep).reverse()[0];
    const configPath = '/c/users/test/documents/lambda-name'.split('/').reverse()[0];
    expect(configPath).toBe('lambda-name');
  });

  test('#2', () => {
    // const configPath = process.cwd().split(path.sep).reverse()[0];
    const configPath = '\\c\\users\\test\\documents\\lambda-name'.split('\\').reverse()[0];
    expect(configPath).toBe('lambda-name');
  });
});
