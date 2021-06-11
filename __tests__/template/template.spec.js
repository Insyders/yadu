const Template = require('../../lib/classes/Template');

describe('Generate a lambda template', () => {
  test('Generate basic template with no SNS and using globals', () => {
    const template = new Template({
      functionName: 'yadu-function',
      description: 'my super yadu function',
      logRetention: 30,
      sns: null,
      lambdaBasePath: './',
      withAllParams: false,
    });

    template.GenerateLambdaSAM();
    template.GenerateLambdaAlarm();
    template.GenerateLambdaLogGroup();

    expect(template.ConvertToYaml().length).toBe(1728);
  });

  test('Generate basic template with an sns and using globals', () => {
    const template = new Template({
      functionName: 'yadu-function',
      description: 'my super yadu function',
      logRetention: 30,
      sns: 'arn:sns:...',
      lambdaBasePath: './',
      withAllParams: false,
    });

    template.GenerateLambdaSAM();
    template.GenerateLambdaAlarm();
    template.GenerateLambdaLogGroup();

    expect(template.ConvertToYaml().length).toBe(1804);
  });

  test('Generate basic template with no SNS and overriding globals', () => {
    const template = new Template({
      functionName: 'yadu-function',
      description: 'my super yadu function',
      logRetention: 30,
      sns: null,
      lambdaBasePath: './',
      withAllParams: true,
    });

    template.GenerateLambdaSAM();
    template.GenerateLambdaAlarm();
    template.GenerateLambdaLogGroup();
    expect(template.ConvertToYaml().length).toBe(1838);
  });
});
