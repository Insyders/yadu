const fs = require('fs');
const path = require('path');
const Converter = require('./ReadYaml');

module.exports = class Cloudformation {
  constructor(config = {}) {
    this.lambdaRegex = config.lambdaRegex || /template.yaml/;
    this.sourceDirectory = config.sourceDirectory || 'aws/lambda/';
    this.application = config.application || 'application.yaml';
    this.lambdaBasePath = config.lambdaBasePath;
    this.stage = config.stage;
    this.accountId = config.accountId;
    this.mapping = config.mapping;

    this.validTemplates = [];
    this.lambdaResources = {};
    this.lambdaGlobals = {};
    this.lambdaOutputs = {};
    this.lambdaTransform = {};
    this.lambdaParameters = {};
    this.applicationJson = {};
  }

  GetLambdas() {
    return this.lambdaResources;
  }

  GetApplicationJson() {
    return this.applicationJson;
  }

  /**
   * scan directories to find cloudformation templates
   * @param {String} baseDir Default: this.sourceDirectory
   * @param {String} parent Default: .
   * @returns Array
   */
  ScanDirectory(baseDir = null, parent = '.') {
    if (!baseDir) {
      baseDir = this.sourceDirectory;
    }

    console.debug(`Try to readdir : ${path.resolve(parent, baseDir)}`);
    const directories = fs.readdirSync(path.resolve(parent, baseDir));

    directories.forEach((dir) => {
      console.debug(`Scanning : ${path.resolve(parent, baseDir) + path.sep + dir}`);
      if (fs.statSync(path.resolve(parent, baseDir) + path.sep + dir).isDirectory() && !dir.match(/.aws_sam/)) {
        console.log(`Found a directory '${path.resolve(parent, baseDir) + path.sep + dir}'`);
        this.ScanDirectory(dir, path.resolve(parent, baseDir));
      }

      console.debug(`Checking regex : ${dir} matches ${this.lambdaRegex}`);
      if (dir.match(this.lambdaRegex)) {
        console.log('Found Lambda template !');
        console.debug(`Valid Template path : ${path.resolve(parent, baseDir)}${path.sep}${dir}`);
        this.validTemplates.push(`${path.resolve(parent, baseDir)}${path.sep}${dir}`);
      }
    });

    console.debug(this.validTemplates);
    return this.validTemplates;
  }

  /**
   * Read Lambda Templates
   */
  ReadTemplate() {
    const convert = new Converter({
      lambdaBasePath: this.lambdaBasePath,
      stage: this.stage,
      accountId: this.accountId,
      mapping: this.mapping,
    });

    this.validTemplates.forEach((template) => {
      console.log(`Read Template : ${template}`);
      convert.LoadYaml(template);
      console.log(convert.json);
      convert.ExtractResources();
      // convert.ExtractLambdaInfo();
      // TODO: Extract Log Group
      // TODO: Extract Alarms
      // TODO: How to do that dynamically
      console.log(convert.GetConverted());
      // FIXME: it doesnt work
      this.lambdaResources = { ...this.lambdaResources, ...convert.GetConverted().Resources };
      this.lambdaGlobals = { ...this.lambdaGlobals, ...convert.GetConverted().Globals };
      this.lambdaOutputs = { ...this.lambdaOutputs, ...convert.GetConverted().Outputs };
      this.lambdaTransform = { ...this.lambdaTransform, ...convert.GetConverted().Transform };
      this.lambdaParameters = { ...this.lambdaParameters, ...convert.GetConverted().Parameters };
    });
  }

  ReadApplicationTemplate() {
    const convert = new Converter({
      lambdaBasePath: this.lambdaBasePath,
      stage: this.stage,
      accountId: this.accountId,
      mapping: this.mapping,
    });
    convert.LoadYaml(this.application);

    this.applicationJson = {
      ...convert.GetFormatVersion(),
      ...convert.GetTransform(),
      ...convert.GetDescription(),
      Globals: { Function: convert.GetGlobals() },
      Parameters: convert.GetParameters(),
      Resources: convert.GetResources(),
      Outputs: convert.GetOutputs(),
    };

    console.debug(this.GetApplicationJson());
  }

  MergeTemplate() {
    if (!this.GetApplicationJson() || Object.keys(this.GetApplicationJson()).length === 0) {
      throw new Error('Missing Application JSON.');
    }

    if (!this.GetLambdas() || Object.values(this.GetLambdas()).length === 0) {
      throw new Error('No lambda found.');
    }

    console.debug('Merging templates');
    // TODO: merge transform
    // FIXME: doesnt work .. need appropriate logic...
    this.applicationJson.Transform = {
      ...this.lambdaTransform,
      ...this.applicationJson.Transform,
    };
    // TODO: merge parameters
    this.applicationJson.Parameters = {
      ...this.lambdaParameters,
      ...this.applicationJson.Parameters,
    };
    // TODO: merge outputs
    this.applicationJson.Outputs = {
      ...this.lambdaOutputs,
      ...this.applicationJson.Outputs,
    };
    // TODO: merge globals
    this.applicationJson.Globals = {
      ...this.lambdaGlobals,
      ...this.applicationJson.Globals,
    };
    // TODO: merge resources
    this.applicationJson.Resources = {
      ...this.lambdaResources,
      ...this.applicationJson.Resources,
    };

    console.log(this.GetApplicationJson());
  }
};
