const fs = require('fs');
const path = require('path');
const jsToYaml = require('json-to-pretty-yaml');
const Converter = require('./ReadYaml');
const { logDebug, logVerbose } = require('../../globals/utils');

// eslint-disable-next-line camelcase
const ignore_patterns = ['.aws-sam', 'node_modules', '.git', '.serverless', 'coverage', '.yadu'];
module.exports = class Cloudformation {
  constructor(config = {}) {
    this.lambdaRegex = config.lambdaRegex || 'template.yaml|template.yml';
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
    this.lambdaTransform = { Transform: [] };
    this.lambdaParameters = {};
    this.lambdaConditions = {};
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
  ScanDirectory(baseDir = null, parent = '.', depth = 0) {
    console.log(`ScanDirectory (${this.validTemplates.length} templates)`);
    logDebug(`Depth = ${depth}`);
    if (!baseDir) {
      logDebug(`Using '${this.sourceDirectory}' has baseDir`);
      baseDir = this.sourceDirectory;
    }

    logDebug(`Try to readdir : ${path.resolve(parent, baseDir)}`);
    const directories = fs.readdirSync(path.resolve(parent, baseDir));

    for (const dir of directories) {
      logDebug(`Scanning : ${path.resolve(parent, baseDir) + path.sep + dir}`);
      if (fs.statSync(path.resolve(parent, baseDir) + path.sep + dir).isDirectory() && !ignore_patterns.includes(dir)) {
        logDebug(`Found a directory '${path.resolve(parent, baseDir) + path.sep + dir}'`);
        this.ScanDirectory(dir, path.resolve(parent, baseDir), (depth += 1));
      }

      // TODO: This logic must be extracted in order to write a unit test
      logDebug(`Checking regex : ${dir} matches ${this.lambdaRegex}`);
      const rgx = new RegExp(this.lambdaRegex);
      if (rgx.exec(dir)) {
        logDebug('Found Lambda template !');
        console.log(`[SUCCESS] Valid Template path : ${path.resolve(parent, baseDir)}${path.sep}${dir}`);
        this.validTemplates.push(`${path.resolve(parent, baseDir)}${path.sep}${dir}`);

        return;
      }
    }

    logDebug(this.validTemplates);
    if (this.validTemplates.length > 1) {
      console.log('[WARNING] YaDU has found more than 1 valid template, it will cause issues.');
    }

    if (this.validTemplates.length === 0) {
      console.log('[WARNING] No Cloudformation/SAM template found. The rest of the execution might not work as expected.');
    }

    return this.validTemplates;
  }

  /**
   * Read Lambda Templates
   */
  ReadTemplate() {
    console.log('ReadTemplate');
    const convert = new Converter({
      lambdaBasePath: this.lambdaBasePath,
      stage: this.stage,
      accountId: this.accountId,
      mapping: this.mapping,
    });

    this.validTemplates.forEach((template) => {
      console.log(`Processing Template : ${template}`);
      convert.LoadYaml(template);
      logDebug(convert.json);
      convert.ExtractResources(template);
      logDebug(convert.GetConverted());
      this.lambdaResources = { ...this.lambdaResources, ...convert.GetConverted().Resources };
      this.lambdaGlobals = { ...this.lambdaGlobals, ...convert.GetConverted().Globals };
      this.lambdaOutputs = { ...this.lambdaOutputs, ...convert.GetConverted().Outputs };
      this.lambdaParameters = { ...this.lambdaParameters, ...convert.GetConverted().Parameters };
      this.lambdaConditions = { ...this.lambdaConditions, ...convert.GetConverted().Conditions };
      if (typeof convert.GetConverted().Transform === 'string') {
        this.lambdaTransform = {
          Transform: [...this.lambdaTransform.Transform, convert.GetConverted().Transform],
        };
      } else {
        logVerbose(`Transform type : ${typeof convert.GetConverted().Transform}`);
        this.lambdaTransform = {
          Transform: [...this.lambdaTransform.Transform, ...convert.GetConverted().Transform],
        };
      }
    });
  }

  ReadApplicationTemplate() {
    console.log('[Action] ReadApplicationTemplate');
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
      ...convert.GetConditions(),
      Globals: { Function: convert.GetGlobals() },
      Parameters: convert.GetParameters(),
      Resources: convert.GetResources(),
      Outputs: convert.GetOutputs(),
    };

    logDebug(this.GetApplicationJson());
  }

  MergeTemplate() {
    console.log('[Action] MergeTemplate');
    if (!this.GetApplicationJson() || Object.keys(this.GetApplicationJson()).length === 0) {
      throw new Error('Missing Application JSON.');
    }

    if (!this.GetLambdas() || Object.values(this.GetLambdas()).length === 0) {
      throw new Error('No lambda found.');
    }

    logDebug('Merging Transform');
    if (typeof this.applicationJson.Transform === 'string') {
      this.applicationJson.Transform = [...this.lambdaTransform.Transform, this.applicationJson.Transform];
    } else {
      this.applicationJson.Transform = [...this.lambdaTransform.Transform, ...this.applicationJson.Transform];
    }
    this.applicationJson.Transform = [...new Set(this.applicationJson.Transform)];

    logDebug('Merging parameters');
    this.applicationJson.Parameters = {
      ...this.lambdaParameters,
      ...this.applicationJson.Parameters,
    };
    logDebug('Merging Outputs');
    this.applicationJson.Outputs = {
      ...this.lambdaOutputs,
      ...this.applicationJson.Outputs,
    };
    logDebug('Merging Globals');

    this.applicationJson.Globals = {
      Function: {
        ...this.lambdaGlobals.Function,
        ...this.applicationJson.Globals.Function,
      },
    };
    this.applicationJson.Globals.Function.Environment = {
      ...this.lambdaGlobals.Function.Environment,
      ...this.applicationJson.Globals.Function.Environment,
    };

    logDebug('Merging Resources');
    this.applicationJson.Resources = {
      ...this.lambdaResources,
      ...this.applicationJson.Resources,
    };

    logDebug('Merging Conditions');
    this.applicationJson.Conditions = {
      ...this.lambdaConditions,
      ...this.applicationJson.Conditions,
    };

    logDebug(this.GetApplicationJson());
  }

  SaveMergedTemplate(filename) {
    console.log('[Action] SaveMergedTemplate');
    fs.writeFileSync(filename, jsToYaml.stringify(this.GetApplicationJson()));

    console.log(`Template saved '${path.resolve('.', `${filename}'`)}`);
  }
};
