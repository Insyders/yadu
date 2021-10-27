const { loadArgs, configureProfileAndRegion, assignVariables } = require('../../libs/loadArgs');
const { assignSecretValues } = require('../../libs/secretManager');

describe('Test liquibase parameter override', () => {
  test('Load process.env', async () => {
    try {
      process.env.AWS_PROFILE = 'test';
      process.env.AWS_REGION = 'ca-central-1';
      process.env.NODE_ENV = 'test';
      // process.env.SECRETS = 'db_prim,db_ref:ref';

      await loadArgs();

      expect(process.env.AWS_PROFILE).toBe('test');
      expect(process.env.AWS_REGION).toBe('ca-central-1');
      expect(process.env.NODE_ENV).toBe('test');
      // expect(process.env.SECRETS).toBe('db_prim,db_ref:ref');
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  test('Load arguments', async () => {
    try {
      process.env.AWS_PROFILE = 'test';
      process.env.AWS_REGION = 'ca-central-1';
      process.env.NODE_ENV = 'test';

      // Simulate --profile, --region & --env
      await loadArgs({
        profile: 'test-args',
        region: 'ca-central-1-args',
        env: 'test-args',
      });

      expect(process.env.AWS_PROFILE).toBe('test-args');
      expect(process.env.AWS_REGION).toBe('ca-central-1-args');
      expect(process.env.NODE_ENV).toBe('test-args');
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  test('Load Database env. variables', async () => {
    process.env.DB_URL_REF = 'my-ref.db.com';
    process.env.DB_EXTRA_REF = '';
    process.env.DB_PORT_REF = 3306;
    process.env.DB_NAME_REF = 'abc';
    process.env.DB_URL = 'my-db.db.com';
    process.env.DB_EXTRA = '';
    process.env.DB_PORT = 3306;
    process.env.DB_NAME = 'abc';

    await loadArgs();

    expect(process.env.DB_URL_REF).toBe('jdbc:mysql://my-ref.db.com:3306/abc?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA_REF).toBe('');
    expect(process.env.DB_PORT_REF).toBe('3306');
    expect(process.env.DB_NAME_REF).toBe('abc');
    expect(process.env.DB_URL).toBe('jdbc:mysql://my-db.db.com:3306/abc?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA).toBe('');
    expect(process.env.DB_PORT).toBe('3306');
    expect(process.env.DB_NAME).toBe('abc');
  });

  test('Load Database using arguments only', async () => {
    await loadArgs({
      'db-url-ref': 'my-ref.db.com',
      'db-user-ref': 'user01',
      'db-pass-ref': 'password01',
      'db-name-ref': 'abc',
      'db-extra-ref': '',
      'db-port-ref': '3306',
      'db-url': 'my-db.db.com',
      'db-user': 'user01',
      'db-pass': 'password001',
      'db-name': 'abc',
      'db-extra': '',
      'db-port': '3306',
    });

    expect(process.env.DB_URL_REF).toBe('jdbc:mysql://my-ref.db.com:3306/abc?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA_REF).toBe('');
    expect(process.env.DB_PORT_REF).toBe('3306');
    expect(process.env.DB_NAME_REF).toBe('abc');
    expect(process.env.DB_URL).toBe('jdbc:mysql://my-db.db.com:3306/abc?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA).toBe('');
    expect(process.env.DB_PORT).toBe('3306');
    expect(process.env.DB_NAME).toBe('abc');
  });

  test('Override Database env. variables with arguments', async () => {
    process.env.DB_URL_REF = 'my-ref.db.com';
    process.env.DB_EXTRA_REF = '';
    process.env.DB_PORT_REF = 3306;
    process.env.DB_NAME_REF = 'abc';
    process.env.DB_URL = 'my-db.db.com';
    process.env.DB_EXTRA = '';
    process.env.DB_PORT = 3306;
    process.env.DB_NAME = 'abc';

    await loadArgs({
      'db-url-ref': 'my-ref-local.db.com',
      'db-user-ref': 'user01',
      'db-pass-ref': 'password01',
      'db-name-ref': 'abc-local',
      'db-extra-ref': '',
      'db-port-ref': '3306',
      'db-url': 'my-db-local.db.com',
      'db-user': 'user01',
      'db-pass': 'password001',
      'db-name': 'abc-local',
      'db-extra': '',
      'db-port': '3306',
    });

    expect(process.env.DB_URL_REF).toBe('jdbc:mysql://my-ref-local.db.com:3306/abc-local?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA_REF).toBe('');
    expect(process.env.DB_PORT_REF).toBe('3306');
    expect(process.env.DB_NAME_REF).toBe('abc-local');
    expect(process.env.DB_URL).toBe('jdbc:mysql://my-db-local.db.com:3306/abc-local?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA).toBe('');
    expect(process.env.DB_PORT).toBe('3306');
    expect(process.env.DB_NAME).toBe('abc-local');
  });

  test('Load parameters using secret manager and override db-name using --db-name', async () => {
    process.env.DB_URL_REF = '';
    process.env.DB_EXTRA_REF = '';
    process.env.DB_PORT_REF = '';
    process.env.DB_NAME_REF = '';
    process.env.DB_URL = '';
    process.env.DB_EXTRA = '';
    process.env.DB_PORT = '';
    process.env.DB_NAME = '';

    await loadArgs();

    configureProfileAndRegion({ profile: 'test-arg', region: 'ca-central-arg' });

    const secretRetrieved = {
      password: 'PASSWORD01',
      engine: 'mysql',
      port: 3306,
      dbInstanceIdentifier: 'db-dev',
      host: 'db-dev.1234567890.us-east-1.rds.amazonaws.com',
      username: 'user01',
    };

    Object.keys(secretRetrieved).forEach((key) => {
      assignSecretValues(false, key, secretRetrieved, 'mydb');
    });

    assignVariables({ 'db-name': 'dev' });

    expect(process.env.DB_URL_REF).toBe('');
    expect(process.env.DB_EXTRA_REF).toBe('');
    expect(process.env.DB_PORT_REF).toBe('');
    expect(process.env.DB_NAME_REF).toBe('');

    expect(process.env.DB_URL).toBe(
      'jdbc:mysql://db-dev.1234567890.us-east-1.rds.amazonaws.com:3306/dev?useUnicode=true&characterEncoding=UTF-8',
    );
    expect(process.env.DB_EXTRA).toBe('');
    expect(process.env.DB_PORT).toBe('3306');
    expect(process.env.DB_NAME).toBe('dev');
  });

  test('Load parameters using secret manager and override --db-url', async () => {
    process.env.DB_URL_REF = '';
    process.env.DB_EXTRA_REF = '';
    process.env.DB_PORT_REF = '';
    process.env.DB_NAME_REF = '';
    process.env.DB_URL = '';
    process.env.DB_EXTRA = '';
    process.env.DB_PORT = '';
    process.env.DB_NAME = '';

    configureProfileAndRegion({ profile: 'test-arg', region: 'ca-central-arg' });

    const secretRetrieved = {
      password: 'PASSWORD01',
      engine: 'mysql',
      port: 3306,
      dbInstanceIdentifier: 'db-dev',
      host: 'db-dev.1234567890.us-east-1.rds.amazonaws.com',
      username: 'user01',
    };

    Object.keys(secretRetrieved).forEach((key) => {
      assignSecretValues(false, key, secretRetrieved, 'mydb');
    });

    assignVariables({ 'db-url': 'abc.com' });

    expect(process.env.DB_URL_REF).toBe('');
    expect(process.env.DB_EXTRA_REF).toBe('');
    expect(process.env.DB_PORT_REF).toBe('');
    expect(process.env.DB_NAME_REF).toBe('');

    expect(process.env.DB_URL).toBe('jdbc:mysql://abc.com:3306/db-dev?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA).toBe('');
    expect(process.env.DB_PORT).toBe('3306');
    expect(process.env.DB_NAME).toBe('db-dev');
  });

  test('Load parameters using env variable and override url using secret manager', async () => {
    process.env.DB_URL_REF = 'dbref-local-env.com';
    process.env.DB_EXTRA_REF = '';
    process.env.DB_PORT_REF = '';
    process.env.DB_NAME_REF = 'db-dev';
    process.env.DB_URL = 'from-local-env.com';
    process.env.DB_EXTRA = '';
    process.env.DB_PORT = '';
    process.env.DB_NAME = '';

    configureProfileAndRegion({ profile: 'test-arg', region: 'ca-central-arg' });

    const secretRetrieved = {
      password: 'PASSWORD01',
      engine: 'mysql',
      port: 3306,
      dbInstanceIdentifier: 'db-dev',
      host: 'db-dev.1234567890.us-east-1.rds.amazonaws.com',
      username: 'user01',
    };

    Object.keys(secretRetrieved).forEach((key) => {
      assignSecretValues(false, key, secretRetrieved, 'mydb');
    });

    assignVariables({});

    expect(process.env.DB_URL_REF).toBe('jdbc:mysql://dbref-local-env.com:3306/db-dev?useUnicode=true&characterEncoding=UTF-8');
    expect(process.env.DB_EXTRA_REF).toBe('');
    expect(process.env.DB_PORT_REF).toBe('');
    expect(process.env.DB_NAME_REF).toBe('db-dev');

    expect(process.env.DB_URL).toBe(
      'jdbc:mysql://db-dev.1234567890.us-east-1.rds.amazonaws.com:3306/db-dev?useUnicode=true&characterEncoding=UTF-8',
    );
    expect(process.env.DB_EXTRA).toBe('');
    expect(process.env.DB_PORT).toBe('3306');
    expect(process.env.DB_NAME).toBe('db-dev');
  });
});
