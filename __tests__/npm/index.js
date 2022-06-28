const shell = require('shelljs');

(() => {
  shell.echo('> Install NodeJs production packages');
  //   shell.rm('-rf', 'node_modules');
  let verbosity = '';
  let timing = '';
  if (process.env.NO_NPM_LOG === '1' || process.env.NO_NPM_LOG === 'true') {
    verbosity = '--silent';
  }
  if (process.env.DEBUG === '1' || process.env.DEBUG === 'true') {
    verbosity = '--loglevel verbose';
  }
  if (process.env.TIMING === '1' || process.env.TIMING === 'true') {
    timing = '--timing';
  }
  // added --legacy-peer-deps to support NPM 7, in our case the peerDeps are provided by the layer in AWS
  const cmd = `npm install ${verbosity} ${timing} --production --legacy-peer-deps`;
  shell.echo(`Command: ${cmd}`);
  shell.exec(cmd);
})();
