const { CloudFormationClient, UpdateStackCommand, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const { logDebug, logVerbose } = require('../globals/utils');

const client = new CloudFormationClient();

module.exports = class CodePipeline {
  constructor(data = {}) {
    this.stackName = data.stackName || null;
    this.parameters = data.parameters ? data.parameters.split(',') : [];

    // WIP Not implemented yet @ 2021-10-27
    this.branchNameKey = data.branchNameKey || 'BranchName';
    this.branchName = data.branchName || 'main';
  }

  async GetCurrentParameters(stackName = null) {
    const result = await client.send(
      new DescribeStacksCommand({
        StackName: stackName || this.stackName,
      }),
    );
    logVerbose(result);

    return result.Stacks[0].Parameters || [];
  }

  async UpdateBranchName(stackName = null, paramKey = 'BranchName', paramValue = 'main') {
    if (!paramKey && !this.branchNameKey) {
      throw new Error('No branch key provided');
    }
    if (!paramValue && !this.branchName) {
      throw new Error('No branch value provided');
    }
    let params = await this.GetCurrentParameters(stackName);

    params = params.map((param) => {
      logVerbose(`${param.ParameterKey} === ${paramKey}`);
      if (param.ParameterKey !== paramKey && param.ParameterKey !== this.branchNameKey) {
        logDebug('No update !');

        param.UsePreviousValue = true;
        param.ParameterValue = null;
      }

      if (param.ParameterKey === paramKey || param.ParameterKey === this.branchNameKey) {
        logDebug('Key Found !');
        param.UsePreviousValue = false;
        param.ParameterValue = paramValue || this.branchName;
      }

      return param;
    });

    logVerbose(params);

    const result = await client.send(
      new UpdateStackCommand({
        StackName: stackName || this.stackName,
        Parameters: params,
        UsePreviousTemplate: true,
      }),
    );

    logVerbose(result);
    return result;
  }
};
