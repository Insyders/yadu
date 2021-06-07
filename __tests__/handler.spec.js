const { Handler } = require('../liquibase');

describe('Run handler', () => {
  test('Call Handler function with no params', async () => {
    const response = await Handler({});

    expect(response).toBeFalsy();
    // expect dry-run to be false by default
    expect(process.env.dryrun === 'false').toBeTruthy();
  });

  test('Call Handler function with dry-run flag', async () => {
    const response = await Handler({ 'dry-run': 1 });

    expect(response).toBeFalsy();
    // expect dry-run to be false by default and be true if --dry-run is specified
    expect(process.env.dryrun === 'true').toBeTruthy();
  });
});
