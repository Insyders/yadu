/* eslint-disable class-methods-use-this */
const { yamlParse } = require('yaml-cfn');
const fs = require('fs');
const path = require('path');

function furtherProcess(content) {
  if (Object.values(content).length === 1) {
    return Object.values(content)[0];
  }

  throw new Error('Not Yet Implemented !');
}

function parseJson(content, mapping = {}) {
  if (!content) {
    throw new Error('Content is undefined');
  }

  // End of line, we received the actual value
  if (content && (typeof content === 'string' || typeof content === 'number')) {
    if (typeof content === 'string') {
      Object.keys(mapping).forEach((mappingKey) => {
        content = content.replace(mappingKey, mapping[mappingKey]);
      });
    }
    return content;
  }

  // Received a potential object
  Object.keys(content).forEach((key) => {
    if (content[key] && (typeof content[key] === 'string' || typeof content[key] === 'number')) {
      if (typeof content[key] === 'string') {
        Object.keys(mapping).forEach((mappingKey) => {
          content[key] = content[key].replace(mappingKey, mapping[mappingKey]);
        });
      }
    }

    if (content[key] && typeof content[key] === 'object' && Array.isArray(content[key])) {
      content[key] = content[key].map((item) => item);
    }

    if (content[key] && typeof content[key] === 'object' && Object.keys(content[key]).length > 0) {
      Object.keys(content[key]).forEach((subKey) => {
        if (subKey === 'Ref' || subKey === 'Fn::Sub' || subKey === 'Fn::ImportValue') {
          if (typeof content[key][subKey] === 'object') {
            // Handle the ImportValue
            content[key] = furtherProcess(content[key][subKey]);
          } else {
            content[key] = content[key][subKey];
          }
        }
      });

      const recursivlyParsed = parseJson(content[key], mapping);
      content[key] = recursivlyParsed;
    }
  });

  return content;
}

class Converter {
  constructor(config) {
    this.json = null;
    this.converted = null;
    this.lambdas = [];
    this.globals = {};

    this.config = {
      lambdaBasePath: config.lambdaBasePath || './',
      stage: config.stage || '',
      accountId: config.accountId || '',
      mapping: config.mapping || {},
    };
  }

  GetConverted() {
    return this.converted;
  }

  GetGlobals() {
    return this.globals;
  }

  LoadYaml(yamlPath) {
    if (!yamlPath) {
      throw new Error('LoadYaml: Missing yaml path');
    }
    this.json = yamlParse(fs.readFileSync(path.resolve(yamlPath), 'utf8'));
    this.lambdas = Object.values(this.json.Resources).filter((resource) => resource.Type === 'AWS::Serverless::Function');
    this.globals = { ...this.json.Globals.Function };
  }

  ExtractLambdaInfo() {
    this.converted = this.lambdas.map((lambda) => {
      const env = {
        Variables: {
          ...(this.GetGlobals().Environment.Variables || {}),
          ...(lambda.Properties.Environment ? lambda.Properties.Environment.Variables : {}),
        },
      };

      const lambdaExtracted = {
        FunctionName: lambda.Properties.FunctionName,
        Description: lambda.Properties.Description,
        Handler: lambda.Properties.Handler || this.globals.Handler,
        Code: `${path.resolve(this.config.lambdaBasePath, lambda.Properties.CodeUri.split('/').reverse()[0])}${path.sep}index.zip`,
        Timeout: lambda.Properties.Timeout || this.globals.Timeout,
        MemorySize: lambda.Properties.MemorySize || this.globals.MemorySize,
        Runtime: lambda.Properties.Runtime || this.globals.Runtime,
        Environment: env,
        Role: lambda.Properties.Role,
        Events: lambda.Properties.Events,
        Layers: lambda.Properties.Layers || [],
        TracingConfig: { Mode: lambda.Properties.TracingConfig || this.globals.Tracing },
        VpcConfig: lambda.Properties.VpcConfig
          ? {
              SecurityGroupIds: lambda.Properties.VpcConfig.SecurityGroupsIds,
              SubnetIds: lambda.Properties.VpcConfig.SubnetIds,
            }
          : {},
      };

      return parseJson(lambdaExtracted, this.config.mapping);
    });
  }
}

module.exports = Converter;
