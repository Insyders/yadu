require('dotenv').config({
  path: `${__dirname}/../.env.${process.env.NODE_ENV}`,
});
const path = require('path');
const YamlConverter = require('../../libs/classes/ReadYaml');

describe('SAM Templates', () => {
  test('Convert SAM Template to JSON', () => {
    const convert = new YamlConverter({
      lambdaBasePath: './',
      stage: 'dev',
      accountId: '1234567890',
      mapping: {
        '-${Stage}': '',
        TracingMode: 'Active',
        NodeEnv: 'development',
        '${CognitoStackName}:IdentityPoolId': 'super-uuid-for-the-identity-pool-id',
        JwtSecretName: 'my-jwt-aws-secret-name',
        '${IAMStackName}:GenericLambdaRole': 'arn:aws:iam::${AWS::AccountId}:role/service-role/basic_lambda_execution',
      },
    });
    convert.LoadYaml(path.join(__dirname, 'api.yaml'));

    convert.ExtractLambdaInfo();
    expect(convert.GetConverted()).toBeDefined();
    console.debug(JSON.stringify(convert.GetConverted(), null, 2));
  });
});
