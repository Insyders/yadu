const ConfigService = require('../lib/classes/Config');
const { sendTelemetry } = require('../lib/telemetry');

describe('Test telemetry endpoint and data collection', () => {
  test('Send Telemetry to endpoint', async () => {
    const res = await sendTelemetry(null);
    expect(res).toBeDefined();

    // console.log(res);
  });

  test('Send Telemetry to endpoint using real information', async () => {
    //   TODO: will not work on other machine.
    const config = ConfigService.LoadConfig(`${__dirname}/../.yadu/config-old.json`);
    // console.log(config);
    const res = await sendTelemetry(config.telemetry.endpoint, config.telemetry.apiKey, config.telemetry.project);
    expect(res).toBeDefined();

    // console.log(res);
  });
});
