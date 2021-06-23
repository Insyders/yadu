const Cloudformation = require('../../lib/classes/Cloudformation');

describe('Test dynamic CloudFormation', () => {
  test('Scan Directory', () => {
    const cfn = new Cloudformation({
      lambdaRegex: /template.yaml/,
      sourceDirectory: './application/lambda/',
      application: './application/cloudformation/api.yaml',
    });

    const validTemplates = cfn.ScanDirectory();
    expect(validTemplates.length).toBe(4);
  });

  test('Scan Directory & extract yaml', () => {
    const cfn = new Cloudformation({
      lambdaRegex: /template.yaml/,
      sourceDirectory: './application/lambda/',
      application: './application/cloudformation/api.yaml',
      lambdaBasePath: './application/lambda',
      stage: 'dev',
      accountId: '123456789012',
      mapping: {
        '${Stage}': 'dev',
        '${AWS::AccountId}': '123456789012',
        '${AWS::Region}': 'us-east-1',
        TracingMode: 'Active',
        '${IAMStackName}:GenericLambdaRole': 'arn:aws:iam::123456789012:role/dev-generic-lambdaRole',
        NodeEnv: 'development',
        Stage: 'dev',
        DefaultHandler: 'src/index.handler',
        NodeModuleLayer: 'arn:aws:lambda:us-east-1:123456789012:layer:node_modules_dev:16',
      },
    });

    const validTemplates = cfn.ScanDirectory();
    expect(validTemplates.length).toBe(4);

    cfn.ReadTemplate();

    console.log(cfn.GetLambdas());
  });

  test('Read Application.yaml for merge', () => {
    const cfn = new Cloudformation({
      lambdaRegex: /template.yaml/,
      sourceDirectory: './application/lambda/',
      application: './application/cloudformation/api.yaml',
      lambdaBasePath: './application/lambda',
      stage: 'dev',
      accountId: '123456789012',
      mapping: {
        '${Stage}': 'dev',
        '${AWS::AccountId}': '123456789012',
        '${AWS::Region}': 'us-east-1',
        TracingMode: 'Active',
        '${IAMStackName}:GenericLambdaRole': 'arn:aws:iam::123456789012:role/dev-generic-lambdaRole',
        NodeEnv: 'development',
        Stage: 'dev',
        DefaultHandler: 'src/index.handler',
        NodeModuleLayer: 'arn:aws:lambda:us-east-1:123456789012:layer:node_modules_dev:16',
      },
    });

    cfn.ScanDirectory();
    cfn.ReadTemplate();
    cfn.ReadApplicationTemplate();

    cfn.MergeTemplate();

    console.log(cfn.GetApplicationJson());
  });
});
