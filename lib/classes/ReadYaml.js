/* eslint-disable class-methods-use-this */
const { yamlParse } = require('yaml-cfn');
const fs = require('fs');
const path = require('path');
const { logDebug } = require('../../globals/utils');

/**
 * Quick fix for nested Object
 * @param {Object} content
 * @returns String
 */
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
    this.parameters = {};
    this.resources = {};
    this.AWSTemplateFormatVersion = {};
    this.description = {};
    this.outputs = {};
    this.transform = {};
    this.conditions = {};

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

  GetResources() {
    return this.resources;
  }

  GetParameters() {
    return this.parameters;
  }

  GetTransform() {
    return this.transform;
  }

  GetOutputs() {
    return this.outputs;
  }

  GetDescription() {
    return this.description;
  }

  GetConditions() {
    return this.conditions;
  }

  GetFormatVersion() {
    return this.AWSTemplateFormatVersion;
  }

  LoadYaml(yamlPath) {
    console.log('LoadYaml');
    if (!yamlPath) {
      throw new Error('LoadYaml: Missing yaml path');
    }
    this.json = yamlParse(fs.readFileSync(path.resolve(yamlPath), 'utf8'));
    this.lambdas = Object.values(this.json.Resources).filter((resource) => resource.Type === 'AWS::Serverless::Function');
    this.resources = { ...this.json.Resources };
    this.parameters = { ...this.json.Parameters };
    this.outputs = { ...this.json.Outputs };
    this.conditions = { ...this.json.Conditions };
    this.AWSTemplateFormatVersion = { AWSTemplateFormatVersion: this.json.AWSTemplateFormatVersion };
    this.description = { Description: this.json.Description };
    this.transform = { Transform: this.json.Transform };

    if (this.json.Globals && this.json) {
      this.globals = { ...this.json.Globals.Function };
    } else {
      this.globals = { Environment: {} };
    }
  }

  ExtractResources() {
    console.log('ExtractResources');
    this.converted = {};
    Object.keys(this.json).forEach((key) => {
      if (
        key === 'Resources' ||
        key === 'Globals' ||
        key === 'Parameters' ||
        key === 'Outputs' ||
        key === 'Transform' ||
        key === 'Conditions'
      ) {
        this.converted[key] = this.json[key];
      }
    });

    logDebug(this.converted);
  }

  ExtractLambdaInfo() {
    console.log('ExtractLambdaInfo');
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
