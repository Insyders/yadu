const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const shell = require('shelljs');
const { getAccountId } = require('./utils');
const Converter = require('./classes/ReadYaml');
const { logDebug, logVerbose, isHome } = require('../globals/utils');
const { sendTelemetry } = require('./telemetry');

const lambda = new AWS.Lambda();
const sts = new AWS.STS();

function loadConfig(config) {
  console.log('Load Config');
  const readYaml = new Converter(config);

  let yamlPath = config.applicationYaml;
  let local = false;

  const cwd = fs.readdirSync(process.cwd());
  const regex = new RegExp(config.lambdaTemplateRegex);

  if (cwd.filter((c) => regex.exec(c)).length > 0) {
    logDebug('Using lambda local template file');
    yamlPath = process.cwd() + path.sep + cwd.filter((c) => c.includes('.yml') || c.includes('.yaml'))[0];
    local = true;
  } else {
    logDebug(`Using : ${path.join(isHome(process.cwd()).path, yamlPath)}`);
    yamlPath = path.join(isHome(process.cwd()).path, yamlPath);
  }

  logDebug(`Application YAML Path: ${yamlPath}`);

  if (!config || !yamlPath) {
    throw new Error('[LoadConfig] Missing application YAML path');
  }

  readYaml.LoadYaml(yamlPath);
  readYaml.ExtractLambdaInfo(local);
  logVerbose(readYaml.GetConverted());

  // we use the process.cwd() because this command should be launched in the lambda directory
  // path.sep is used to be compatible with windows
  const configPath = process.cwd().split(path.sep).reverse()[0];
  logDebug(path.sep + configPath + path.sep);

  // eslint-disable-next-line prefer-destructuring
  const info = readYaml.GetConverted().filter((converted) => {
    logDebug(`Code: ${converted.Code}`);
    // Forced to use slashes because cloudformation is written using the /
    logDebug(`Is '${converted.Code}' includes '${path.sep}${configPath}${path.sep}' ?`);
    return converted.Code.includes(`${path.sep}${configPath}${path.sep}`) || (local && converted.Code.includes(`.${path.sep}index.zip`));
  })[0];

  if (!info) {
    throw new Error(`Configuration '${configPath}' not Found using '${yamlPath}'`);
  }

  console.log(`Found '${configPath}' !`);

  // Use the zipArgs configured in the config service.
  info.zipArgs = config.zipArgs;
  logVerbose(info);

  return info;
}

function listVersions(fnName, marker = '') {
  return new Promise((resolve, reject) => {
    let result = null;
    const params = {
      FunctionName: fnName,
    };
    if (marker) {
      params.Marker = marker;
    }

    lambda.listVersionsByFunction(params, async (versionErr, versiondata) => {
      if (versionErr) {
        return reject(versionErr); // an error occurred
      }

      if (versiondata.NextMarker) {
        result = await listVersions(fnName, versiondata.NextMarker);
      } else {
        result = versiondata.Versions[versiondata.Versions.length - 1].Version;
      }
      return resolve(result);
    });
  });
}

async function getLatestVersion({ FunctionName }) {
  const latestVersion = await listVersions(FunctionName).catch((e) => {
    throw e;
  });
  return latestVersion;
}

/**
 * Check if the serverless.json file exists
 */
function CheckIfServerlessExists() {
  try {
    if (fs.statSync('./serverless.json').isFile()) {
      return true;
    }
    return false;
  } catch (e) {
    logDebug(e);
    console.error(`${'[ERROR]'.error} CheckIfServerlessExists: ${e.message}`);
    return false;
  }
}
/**
 * Read the serverless.json and returns its content
 */
function GetLambdaInfo() {
  const info = fs.readFileSync('./serverless.json', { encoding: 'utf-8' });
  return JSON.parse(info);
}

/**
 * Publish or Package the lambda function
 */
async function publish(args, config = {}) {
  // If we want to override the layerVersion maybe useful for testing, multi-region/multi-account for CD
  const DEBUG = !!(args.debug || process.env.DEBUG === 'true');
  const VERBOSE = !!(args.verbose || process.env.VERBOSE === 'true');
  const REGION = args.region || process.env.AWS_REGION || process.env.REGION || config.version || null;
  const LAYER_VERSION = process.env.LAYER_VERSION || args.layerVersion || args['layer-version'] || config.layerVersion || null;
  const ACCOUNT_ID = process.env.ACCOUNT_ID || config.accountId || getAccountId(args, sts) || null;

  shell.echo('Retrieve current branch name and last Commit Id'.info);
  let gitResponse = shell.exec('git branch --show-current', { silent: !DEBUG });
  if (gitResponse.code !== 0) {
    console.error(gitResponse.stderr);
    throw new Error('You must upgrade your git version.');
  }
  const currentBranchName = gitResponse.stdout || 'Unknown-branch';

  gitResponse = shell.exec('git rev-parse --short HEAD', { silent: !DEBUG });
  if (gitResponse.code !== 0) {
    console.error(gitResponse.stderr);
    throw new Error('You must upgrade your git version.');
  }
  const lastCommitId = gitResponse.stdout || process.env.USER || 'unknown-commit-id';

  shell.echo('Check if serverless.json exists or use the cloudformation as source of configuration...'.info);
  let info = {};
  if (args['use-yaml']) {
    try {
      info = loadConfig(config);
    } catch (e) {
      logDebug(e);
      throw e;
    }

    // Only for informative purpose
    if (args['info-only']) {
      console.log(JSON.stringify(info, null, 2));
      process.exit(0);
    }
  } else if (CheckIfServerlessExists()) {
    info = GetLambdaInfo();
  } else {
    throw new Error('Please configure the aws command manually or create a serverless.json, or --use-yaml to use the config service.');
  }

  let functionName = info.FunctionName;
  if (args.stage) {
    shell.echo(`Override Function Name to ${functionName}-${args.stage}`);
    functionName += `-${args.stage}`;
  }

  shell.echo('> Collecting function configuration'.info);
  const updateCreateFnParams = {
    FunctionName: functionName,
    Description: `${info.Description} (${
      process.env.AWS_BRANCH_NAME ||
      // eslint-disable-next-line max-len
      currentBranchName.replace('\n', '')
    }-${lastCommitId.replace('\n', '')}) at ${new Date().toISOString().replace(/[:.T]/g, '_')}`,
    Handler: info.Handler,
    MemorySize: info.MemorySize,
    Runtime: info.Runtime,
    Timeout: info.Timeout,
  };
  logDebug('> Collected function configuration');

  // Environment Variables
  if (info.Environment) {
    console.log('Update lambda Environment Configuration');
    updateCreateFnParams.Environment = {
      Variables: info.Environment.Variables || info.Environment,
    };
  }

  // VPC Configuration
  if (args.updateVpc || args['update-vpc']) {
    console.log('Update lambda VPC Configuration');
    updateCreateFnParams.VpcConfig = {
      SecurityGroupIds: info.vpcConfig.SecurityGroupsIds,
      SubnetIds: info.vpcConfig.SubnetIds,
    };
  }

  // Layers
  if (info.Layers && info.Layers.length > 0) {
    console.log('Update lambda Layer(s)');
    let layers = [];
    if (!args.layers) {
      info.Layers.forEach((layer) => {
        if (typeof layer === 'string') {
          let localLayer = layer.replace(/\${AWS::AccountId}/, ACCOUNT_ID).replace(/\${AWS::Region}/, REGION);

          if (LAYER_VERSION && LAYER_VERSION !== 'null') {
            shell.echo(`> Overriding the Layer version to ${LAYER_VERSION}`.info);
            localLayer = localLayer.replace(/[0-9]*$/, LAYER_VERSION);
          }

          layers.push(localLayer);
        } else {
          console.log(`${'[WARN]'.warn} The layer type is different than string, the layer will not be attached.`);
        }
      });
    } else {
      logDebug(`Override Layers to ${args.layers.split(',')}`);
      layers = args.layers.split(',');
    }

    updateCreateFnParams.Layers = layers;
  }

  // X-Ray
  if (info.TracingConfig) {
    console.log('Update lambda Tracing Configuration');
    updateCreateFnParams.TracingConfig = info.TracingConfig;
  }

  // Role
  if (args.updateRole || args['update-role']) {
    console.log('Update lambda Role');
    if (!args.role) {
      updateCreateFnParams.Role = `${info.Role['Fn::Sub'].replace(/\${AWS::AccountId}/, ACCOUNT_ID)}`;
    } else {
      logDebug(`Override role to ${args.role}`);
      updateCreateFnParams.Role = args.role;
    }
  }

  if (args['show-config']) {
    shell.echo('> Show Lambda Configuration');
    console.log(JSON.stringify(updateCreateFnParams, null, 2));
    process.exit(0);
  }

  shell.echo("> Delete existing 'index.zip' file (if any)".info);
  shell.rm('index.zip');

  if (info.zipArgs.includes('node_modules')) {
    shell.echo('> Install NodeJs production packages'.info);
    shell.rm('-rf', 'node_modules');
    // added --legacy-peer-deps to support NPM 7, in our case the peerDeps are provided by the layer in AWS
    shell.exec('npm install --silent --production --legacy-peer-deps');
  }

  shell.echo('> Create Tag File'.info);
  // Delete old/existing commit id files
  shell.rm(`_*_`);
  shell.touch(`_${lastCommitId.replace('\n', '')}_`);

  shell.echo('> Packaging lambda'.info);
  shell.exec(`zip -X ${VERBOSE ? '-vvv' : '-q'} -r index.zip ${info.zipArgs} _*_`);

  shell.echo('> Delete Tag File'.info);
  shell.rm(`_${lastCommitId.replace('\n', '')}_`);

  if (args.deploy) {
    shell.echo('> Uploading code to AWS'.info);

    const dataUpdateFunctionCode = await lambda
      .updateFunctionCode({
        FunctionName: functionName,
        Publish: args.publish || false,
        ZipFile: fs.readFileSync(path.resolve(process.cwd(), 'index.zip')),
      })
      .promise()
      .catch((e) => {
        throw e;
      });

    logDebug(dataUpdateFunctionCode);

    shell.echo('> Deploy the lambda configuration');
    const dataUpdateFunctionConfiguration = await lambda
      .updateFunctionConfiguration(updateCreateFnParams)
      .promise()
      .catch((e) => {
        throw e;
      });
    logDebug(args, dataUpdateFunctionConfiguration);
  }

  if (args.create) {
    shell.echo('> Create the lambda function');
    const createNewFunction = await lambda
      .createFunction(updateCreateFnParams)
      .promise()
      .catch((e) => {
        throw e;
      });
    console.log(`${'[WARN]'.warn} 'Permissions' must be added manually FEATURE REQUEST`);
    console.log(`${'[WARN]'.warn} 'Aliases' must be added manually FEATURE REQUEST`);
    logDebug(args, createNewFunction);
  }

  if (args.newVersion || args['new-version']) {
    shell.echo('> Create a new version');
    const { Version } = await lambda
      .publishVersion({
        FunctionName: functionName,
      })
      .promise();

    logDebug(`Version: ${Version}`);

    const dataUpdateAlias = await lambda
      .updateAlias({
        FunctionName: `${functionName}`,
        Name: `${args.alias}`,
        FunctionVersion: `${Version}`,
        Description: `(${
          process.env.AWS_BRANCH_NAME ||
          // eslint-disable-next-line max-len
          currentBranchName.replace('\n', '')
        }-${lastCommitId.replace('\n', '')}) at ${new Date().toISOString().replace(/[:.T]/g, '_')}`,
      })
      .promise()
      .catch((e) => {
        throw e;
      });

    logDebug(args, `${functionName} : '${args.alias}' alias version set to V${Version}`);

    logDebug(args, dataUpdateAlias);
  }

  // Attach to the specified alias
  if (args.attach) {
    shell.echo(`> Attach the version to ${args.attach}`.info);
    let fnVersion = null;

    // Get Latest fnVersion
    fnVersion = await getLatestVersion({ FunctionName: functionName });

    if (!fnVersion) {
      throw new Error('No version specified');
    }

    const dataUpdateAlias = await lambda
      .updateAlias({
        FunctionName: `${functionName}`,
        Name: `${args.attach}`,
        FunctionVersion: `${fnVersion}`,
        Description: `(${
          process.env.AWS_BRANCH_NAME ||
          // eslint-disable-next-line max-len
          currentBranchName.replace('\n', '')
        }-${lastCommitId.replace('\n', '')}) at ${new Date().toISOString().replace(/[:.T]/g, '_')}`,
      })
      .promise()
      .catch((e) => {
        throw e;
      });

    logDebug(args, `${functionName} : '${args.attach}' alias version set to V${fnVersion}`);

    logDebug(args, dataUpdateAlias);
  }

  // allows to test locally without reinstalling the dependencies manually.
  if (process.env.NODE_ENV !== 'CI') {
    shell.echo('> Restore the devDependencies'.info);
    shell.exec('npm install');
  }

  if (config && config.telemetry) {
    await sendTelemetry(config.telemetry.endpoint, config.telemetry.apiKey, config.telemetry.project);
  }

  shell.echo('Voila !'.success);
}

module.exports = {
  listVersions,
  getLatestVersion,
  CheckIfServerlessExists,
  GetLambdaInfo,
  publish,
};
