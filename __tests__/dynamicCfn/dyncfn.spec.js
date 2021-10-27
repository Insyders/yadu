const path = require('path');
const Cloudformation = require('../../libs/classes/Cloudformation');

describe('Test dynamic CloudFormation', () => {
  test('Scan Directory', () => {
    const cfn = new Cloudformation({
      lambdaRegex: 'template.yaml',
      sourceDirectory: path.join(__dirname, 'application', 'lambda'),
      application: `${path.join(__dirname, 'application', 'cloudformation') + path.sep}api.yaml`,
    });

    const validTemplates = cfn.ScanDirectory();
    expect(validTemplates.length).toBe(4);
  });

  test('Scan Directory & extract yaml', () => {
    const cfn = new Cloudformation({
      lambdaRegex: 'template.yaml',
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
      lambdaRegex: 'template.yaml',
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
    expect(Object.keys(cfn.GetApplicationJson()).length).toBe(8);
    expect(Object.keys(cfn.GetApplicationJson().Resources).length).toBe(7);
    expect(Object.keys(cfn.GetApplicationJson().Outputs).length).toBe(3);
    expect(Object.keys(cfn.GetApplicationJson().Parameters).length).toBe(20);
    expect(Object.keys(cfn.GetApplicationJson().Globals.Function).length).toBe(8);
    expect(cfn.GetApplicationJson().Transform.length).toBe(2);

    cfn.SaveMergedTemplate('test.yaml');
  });
});

describe('Test Regex', () => {
  test('Regex seems to allow too much information', () => {
    const dirs = [
      "/Users/user01/Documents/application/lambda/yadu/serverless.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yaml",
      "/Users/user01/Documents/application/lambda/yadu/serverless-whatever.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.json",]

    const lambdaRegex = "template.yaml|template.yml"
    const rgx = new RegExp(lambdaRegex);
    dirs.forEach(dir => {
      expect(rgx.exec(dir)).toBeFalsy()
    })
  })

  test('Regex should return 2 results', () => {
    const dirs = [
      "/Users/user01/Documents/application/lambda/yadu/template.yaml",
      "/Users/user01/Documents/application/lambda/yadu/template.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yaml",
      "/Users/user01/Documents/application/lambda/yadu/serverless-whatever.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.json",]

    const lambdaRegex = "template.yaml|template.yml"
    const rgx = new RegExp(lambdaRegex);
    expect(dirs.filter(dir => {
      return rgx.exec(dir)
    }).length).toBe(2)
  })

  test('Regex should return 1 result', () => {
    const dirs = [
      "/Users/user01/Documents/application/lambda/yadu/template.yaml",
      "/Users/user01/Documents/application/lambda/yadu/template.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yaml",
      "/Users/user01/Documents/application/lambda/yadu/serverless-whatever.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.json",
    ]

    const lambdaRegex = /template.yaml/;
    const rgx = new RegExp(lambdaRegex);
    expect(dirs.filter(dir => {
      return rgx.exec(dir)
    }).length).toBe(1)
  })

  test('Regex should return 0 result', () => {
    const dirs = [
      "/Users/user01/Documents/application/lambda/yadu/template.yaml",
      "/Users/user01/Documents/application/lambda/yadu/template.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yaml",
      "/Users/user01/Documents/application/lambda/yadu/serverless-whatever.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.json",
    ]

    const lambdaRegex = null;
    const rgx = new RegExp(lambdaRegex);
    expect(dirs.filter(dir => {
      return rgx.exec(dir)
    }).length).toBe(0)
  })

  test('Regex should return 6 results', () => {
    const dirs = [
      "/Users/user01/Documents/application/lambda/yadu/template.yaml",
      "/Users/user01/Documents/application/lambda/yadu/template.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.yaml",
      "/Users/user01/Documents/application/lambda/yadu/serverless-whatever.yml",
      "/Users/user01/Documents/application/lambda/yadu/serverless.json",
    ]

    const lambdaRegex = "";
    const rgx = new RegExp(lambdaRegex);
    expect(dirs.filter(dir => {
      return rgx.exec(dir)
    }).length).toBe(6)
  })
  test('Regex seems to be empty', () => {
    const input = {lambdaRegex: ""};

    const lambdaRegex = input.lambdaRegex || "template.yml";
    expect(lambdaRegex).toBe("template.yml")
  })
})