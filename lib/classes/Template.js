const jsToYaml = require('json-to-pretty-yaml');
const { FirstLetterUpper, Normalize } = require('../../globals/utils');

module.exports = class Template {
  constructor(config) {
    this.functionName = config.functionName;
    this.description = config.description;
    this.retention = config.retention || 90;
    this.hasSns = config.sns || false;
    this.sns = config.sns || null;
    this.lambdaBasePath = config.lambdaBasePath || null;
    this.withAllParams = config.withAllParams || false;

    this.template = {};
  }

  GenerateLambdaAlarm() {
    const alarm = {
      Type: 'AWS::CloudWatch::Alarm',
      Properties: {
        AlarmName: { 'Fn::Sub': `${this.functionName}-errors` },
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 5,
        Threshold: 1,
        Period: 60,
        Statistic: 'Sum',
        TreatMissingData: 'notBreaching',
        Namespace: 'AWS/Lambda',
        MetricName: 'Errors',
        Dimensions: [
          {
            Name: 'FunctionName',
            Value: { 'Fn::Sub': `${this.functionName}` },
          },
          {
            Name: 'Resource',
            Value: { 'Fn::Sub': `${this.functionName}:\${AutoPublishAlias}` },
          },
        ],
      },
    };

    if (this.hasSns) {
      alarm.Properties.AlarmActions = [
        // eslint-disable-next-line no-template-curly-in-string
        { 'Fn::ImportValue': { 'Fn::Sub': this.sns } },
      ];
    }

    this.template[`${FirstLetterUpper(Normalize(this.functionName))}Alarm`] = alarm;
  }

  GenerateLambdaSAM() {
    const fnDefinition = {
      Type: 'AWS::Serverless::Function',
      Properties: {
        FunctionName: { 'Fn::Sub': `${this.functionName}` },
        Description: this.description,
        CodeUri: `${this.lambdaBasePath}/${this.functionName}`,
        Role: {
          // eslint-disable-next-line no-template-curly-in-string
          'Fn::ImportValue': { 'Fn::Sub': '${IAMStackName}:GenericLambdaRole' },
        },
        Events: {
          ApiGetEventSecured: {
            Type: 'Api',
            Properties: {
              Method: 'get',
              Path: `/${this.functionName}/placeholder`,
              RestApiId: { Ref: 'RestApi' },
              Auth: {
                Authorizer: 'AWS_IAM',
              },
            },
          },
          ApiPostEventPublic: {
            Type: 'Api',
            Properties: {
              Method: 'post',
              Path: '/public',
              RestApiId: { Ref: 'RestApi' },
              Auth: {
                Authorizer: 'NONE',
              },
            },
          },
          ApiPostEventApiKey: {
            Type: 'Api',
            Properties: {
              Method: 'post',
              Path: '/apikey',
              RestApiId: { Ref: 'RestApi' },
              Auth: {
                ApiKeyRequired: true,
              },
            },
          },
        },
        Tags: {
          Project: { Ref: 'ProjectName' },
          Stage: { Ref: 'Stage' },
        },
      },
    };

    if (this.withAllParams) {
      fnDefinition.Properties.Timeout = 30;
      fnDefinition.Properties.MemorySize = 128;
      fnDefinition.Properties.Layers = [];
      fnDefinition.Properties.Runtime = 'nodejs12.x';
      fnDefinition.Properties.Handler = 'src/index.handler';
    }

    this.template[`${FirstLetterUpper(Normalize(this.functionName))}LambdaFunction`] = fnDefinition;
  }

  GenerateLambdaLogGroup() {
    const logGroup = {
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: { 'Fn::Sub': `/aws/lambda/${this.functionName}` },
        RetentionInDays: this.retention,
      },
    };

    this.template[`${FirstLetterUpper(Normalize(this.functionName))}LogGroup`] = logGroup;
  }

  ConvertToYaml() {
    const data = jsToYaml.stringify(this.template);
    return data;
  }
};
