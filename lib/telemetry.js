/* eslint-disable global-require */
const os = require('os');
const path = require('path');
const shell = require('shelljs');
const axios = require('axios').default;

async function sendTelemetry(endpoint = 'http://127.0.0.1', apiKey = null, project = null) {
  try {
    const data = {
      npmVersion: shell.exec('npm --version', { silent: true }).stdout.replace('\n', ''),
      gitVersion: shell.exec('git --version', { silent: true }).stdout.replace('\n', ''),
      nodeVersion: shell.exec('node --version', { silent: true }).stdout.replace('\n', ''),
      branch: shell.exec('git branch --show-current', { silent: true }).stdout.replace('\n', ''),
      commitId: shell.exec('git rev-parse HEAD', { silent: true }).stdout.replace('\n', ''),
      yaduVersion: require('../package.json').version,
      osPlatform: os.platform(),
      osRelease: os.release(),
      osType: os.type(),
      osArch: os.arch(),
      shell: os.userInfo().shell,
      username: os.userInfo().username,
      cwd: process.cwd().split(path.sep).reverse()[0],
      message: 'Sent From YaDU',
      project,
    };

    // console.debug(data);

    if (process.env.DISABLE_TELEMETRY === 'true' || process.env.DISABLE_TELEMETRY === 1) {
      console.debug('Telemetry disabled');
      return null;
    }

    const response = await axios.post(endpoint, data, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });
    // console.debug(response);
    console.log("To disable telemetry : DISABLE_TELEMETRY='true'");
    return response;
  } catch (e) {
    console.error(e);
    // Don't fail on error...
    return null;
  }
}

module.exports = {
  sendTelemetry,
};
