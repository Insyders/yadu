require('dotenv').config({
  path: `${__dirname}/../.env.${process.env.NODE_ENV}`,
});
const YamlConverter = require('../../lib/readYaml');

function parseJson(content) {
  if (!content) {
    throw new Error('Content is undefined');
  }

  Object.keys(content).forEach((key) => {
    console.log(key);
    if (content[key] && (typeof content[key] === 'string' || typeof content[key] === 'number')) {
      return;
    }

    if (content[key] && typeof content[key] === 'object' && Array.isArray(content[key])) {
      content[key] = content[key].map((item) => item);
      return;
    }

    if (content[key] && typeof content[key] === 'object' && Object.keys(content[key]).length > 0) {
      Object.keys(content[key]).forEach((subKey) => {
        if (subKey === 'Ref' || subKey === 'Fn::Sub' || subKey === 'Fn::ImportValue') {
          content[key] = content[key][subKey];
        }
      });

      const recursivlyParsed = parseJson(content[key]);
      content[key] = recursivlyParsed;
    }
  });

  return content;
}

describe('SAM Templates', () => {
  test('Convert SAM Template to JSON', () => {
    const convert = new YamlConverter({
      lambdaBasePath: './',
      stage: 'dev',
      accountId: '1234567890',
      mapping: {
        '-${Stage}': '',
        TracingMode: 'Active',
      },
    });
    convert.LoadYaml('./api.yaml');

    convert.ExtractLambdaInfo();
    expect(convert.GetConverted()).toBeDefined();
    console.debug(JSON.stringify(convert.GetConverted(), null, 2));

    let parsed = null;
    convert.GetConverted().forEach((data) => {
      parsed = parseJson(data);
    });

    convert.HandleIntrinsicFunctions(parsed);

    console.log(convert.GetConverted());
  });
});
