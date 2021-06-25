const path = require('path');
const Cloudformation = require('../../lib/classes/Cloudformation');

describe('Test dynamic CloudFormation', () => {
  test('Scan Directory', () => {
    const cfn = new Cloudformation({
      lambdaRegex: /template.yaml/,
      sourceDirectory: path.join(__dirname, 'application', 'lambda'),
      application: `${path.join(__dirname, 'application', 'cloudformation') + path.sep}api.yaml`,
    });

    const validTemplates = cfn.ScanDirectory();
    expect(validTemplates.length).toBe(4);
  });

  test('Scan Directory & extract yaml', () => {
    const cfn = new Cloudformation({
      lambdaRegex: /template.yaml/,
      sourceDirectory: path.join(__dirname, 'application', 'lambda'),
      application: `${path.join(__dirname, 'application', 'cloudformation') + path.sep}api.yaml`,
      lambdaBasePath: path.join(__dirname, 'application', 'lambda'),
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
  });

  test('Read Application.yaml for merge', () => {
    const cfn = new Cloudformation({
      lambdaRegex: /template.yaml/,
      sourceDirectory: path.join(__dirname, 'application', 'lambda'),
      application: `${path.join(__dirname, 'application', 'cloudformation') + path.sep}api.yaml`,
      lambdaBasePath: path.join(__dirname, 'application', 'lambda'),
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

    const dirs = cfn.ScanDirectory();
    expect(dirs.length).toBe(4);

    cfn.ReadTemplate();

    cfn.ReadApplicationTemplate();
    expect(Object.keys(cfn.GetApplicationJson()).length).toBe(7);

    cfn.MergeTemplate();
    expect(Object.keys(cfn.GetApplicationJson()).length).toBe(7);
    expect(Object.keys(cfn.GetApplicationJson().Resources).length).toBe(7);
    expect(Object.keys(cfn.GetApplicationJson().Outputs).length).toBe(3);
    expect(Object.keys(cfn.GetApplicationJson().Parameters).length).toBe(20);
    expect(Object.keys(cfn.GetApplicationJson().Globals.Function).length).toBe(8);
    expect(cfn.GetApplicationJson().Transform.length).toBe(2);

    cfn.SaveMergedTemplate('test.yaml');
  });
});
