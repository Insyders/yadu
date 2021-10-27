const path = require('path');
const { logVerbose, isHome, logDebug } = require('../../globals/utils');
const Cloudformation = require('../../classes/Cloudformation');

module.exports = (args, config) => {
  if (!args.cloudformation) {
    return false;
  }
  console.log('> Cloudformation Merging Tool');
  if (!args.filename) {
    throw new Error('Missing --filename');
  }

  logDebug(`Filename: ${args.filename}`);
  logVerbose(config);

  const home = isHome(process.cwd());
  logDebug(home);

  const cfnConfig = {
    lambdaRegex: config.lambdaTemplateRegex || /template.yaml/,
    sourceDirectory: path.resolve(home.path, config.lambdaSourcePath),
    application: path.resolve(home.path) + path.sep + config.applicationYaml,
    lambdaBasePath: config.lambdaBasePath,
    layerBasePath: config.layerBasePath,
    stage: config.stage,
    accountId: config.accountId,
    mapping: config.mapping || {},
  };

  logDebug(cfnConfig);

  const cfn = new Cloudformation(cfnConfig);

  console.log('> Launch cloudformation merging tool');
  cfn.ScanDirectory();
  cfn.ReadTemplate();
  cfn.ReadApplicationTemplate();
  cfn.MergeTemplate();
  cfn.SaveMergedTemplate(args.filename);

  return true;
};
