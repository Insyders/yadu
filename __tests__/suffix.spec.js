test('Suffix for secret manager', () => {
  const dummySecrets = {
    databaseDev: {
      username: 'foo',
      password: 'bar',
      host: 'localhost',
      port: 3306,
    },
    databaseQa: {
      username: 'foo',
      password: 'bar',
      host: 'localhost',
      port: 3306,
    },
  };

  const secrets = 'databaseDev,databaseQa:ref';

  secrets.split(',').forEach((secret) => {
    let hasSuffix = false;
    if (secret.includes(':')) {
      hasSuffix = true;
    }
    const secretParsed = dummySecrets[secret.split(':')[0]];
    expect(secretParsed).toEqual({ username: 'foo', password: 'bar', host: 'localhost', port: 3306 });

    Object.keys(secretParsed).forEach((key) => {
      const tKey = hasSuffix ? `${key}_${secret.split(':')[1]}` : key;

      if (hasSuffix) {
        expect(tKey).toMatch(`${key}_${secret.split(':')[1]}`);
      } else {
        expect(tKey).toMatch(key);
      }

      if (key === 'username') {
        process.env[`DB_USER${hasSuffix ? `_${secret.split(':')[1].toUpperCase()}` : ''}`] = secretParsed[key];

        if (hasSuffix) {
          expect(process.env.DB_USER_REF).toBeDefined();
        } else {
          expect(process.env.DB_USER).toBeDefined();
        }
        console.debug(process.env);
      }
    });
  });
});
