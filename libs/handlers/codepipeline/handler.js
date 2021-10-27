const { logDebug } = require('../../globals/utils');
const CodePipeline = require('../../classes/CodePipeline');

module.exports = async (args, config = {}) => {
  const client = new CodePipeline(config);

  if (args['get-current-parameters']) {
    console.log(`[ACTION] Get Current Parameters for ${args['stack-name']}`);
    if (!args['stack-name']) {
      throw new Error('Missing --stack-name');
    }
    logDebug(`Stack Name: ${args['stack-name']}`);
    const response = await client.GetCurrentParameters(args['stack-name']);
    logDebug(response);
    console.table(response.map((param) => ({ key: param.ParameterKey, value: param.ParameterValue })));
    return true;
  }

  if (args['update-branch-name']) {
    console.log(
      `[ACTION] Update Branch Name for ${args['stack-name']} with (Key: ${args.key || 'DEFAULT'}; Value: ${
        args.value || 'DEFAULT'
      }) or using the default values`,
    );
    if (!args['stack-name']) {
      throw new Error('Missing --stack-name');
    }
    logDebug(`Stack Name: ${args['stack-name']}`);
    logDebug(`Parameter key: ${args.key} and value: ${args.value}`);
    const response = await client.UpdateBranchName(args['stack-name'], args.key, args.value);
    logDebug(response);
    console.log('Stack Up-to-Date');
    return true;
  }

  return false;
};
