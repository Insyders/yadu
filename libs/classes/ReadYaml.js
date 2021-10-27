/* eslint-disable class-methods-use-this */
const { yamlParse } = require('yaml-cfn');
const fs = require('fs');
const path = require('path');
const { logDebug, logVerbose } = require('../globals/utils');

/**
 * Quick fix for nested Object
 * @param {Object} content
 * @returns String
 */
function furtherProcess(content) {
  logDebug('Further process');
  logDebug(content);
  if (Object.values(content).length === 1) {
    return Object.values(content)[0];
  }

  // TODO: Improve that approach
  if (Object.values(content).length === 3) {
    // Handling Fn::If only
    return Object.values(content)[0];
  }

  throw new Error('Not Yet Implemented !');
}

function parseJson(content, mapping = {}) {
  logDebug('Parse JSON');
  if (!content) {
    throw new Error('Content is undefined');
  }

  // End of line, we received the actual value
  if (content && (typeof content === 'string' || typeof content === 'number')) {
    if (typeof content === 'string') {
      logDebug(mapping);
      Object.keys(mapping).forEach((mappingKey) => {
        logDebug(`Processing mappingKey : ${mappingKey}`);
        content = content.replace(mappingKey, mapping[mappingKey]);
      });
    }
    logDebug(`content: ${content}`);
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
        if (
          subKey === 'Ref' ||
          subKey === '!Ref' ||
          subKey === 'Fn::Sub' ||
          subKey === '!Sub' ||
          subKey === 'Fn::ImportValue' ||
          subKey === '!ImportValue' ||
          subKey === 'Fn::If' ||
          subKey === '!If'
        ) {
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
      layerBasePath: config.layerBasePath || './',
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

  /**
   * Load Yaml Configuration using a cloudformation file.
   * @param {String} yamlPath
   */
  LoadYaml(yamlPath) {
    console.log('[Action] LoadYaml');
    if (!yamlPath) {
      throw new Error('LoadYaml: Missing yaml path');
    }
    logVerbose(`Using this path : ${path.resolve(yamlPath)}`);

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

    logDebug(`JSON: ${JSON.stringify(this.json)}`);
  }

  ExtractResources(filepath) {
    console.log('[Action] ExtractResources');
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

    logDebug('> Update CodeUri of lambdas using the lambdaBasePath');
    Object.values(this.converted.Resources)
      .filter((resource) => resource.Type === 'AWS::Serverless::Function')
      .map((r) => {
        logVerbose(this.config.lambdaBasePath, filepath.split(path.sep).reverse()[0]);
        r.Properties.CodeUri = this.config.lambdaBasePath + filepath.split(path.sep).reverse()[1];
        return r;
      });

    logDebug('> Update ContentUri of lambdas using the layerBasePath');
    Object.values(this.converted.Resources)
      .filter((resource) => resource.Type === 'AWS::Serverless::LayerVersion')
      .map((r) => {
        logVerbose(this.config.layerBasePath);
        r.Properties.ContentUri = this.config.layerBasePath;
        return r;
      });

    logDebug(`converted: ${this.converted}`);
  }

  ExtractLambdaInfo(local = false) {
    console.log('[Action] ExtractLambdaInfo');
    logDebug(`converted: ${this.converted}`);
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
        Code: `${local ? '.' : path.resolve(this.config.lambdaBasePath, lambda.Properties.CodeUri.split('/').reverse()[0])}${
          path.sep
        }index.zip`,
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
