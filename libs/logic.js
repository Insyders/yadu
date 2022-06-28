const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const shell = require('shelljs');
const { getAccountId, defaultZip } = require('./utils');
const Converter = require('./classes/ReadYaml');
const { logDebug, logVerbose, isHome } = require('./globals/utils');
const { sendTelemetry } = require('./telemetry');

const lambda = new AWS.Lambda();
const sts = new AWS.STS();

function getZipFileName(args) {
  if (args['zip-filename-from-parent']) {
    return process.cwd().split(path.sep).reverse()[0];
  }
  return args['zip-filename'] ? args['zip-filename'] : 'index.zip';
}

function waitFor(functionName, interval = 3000) {
  return new Promise((resolve) => {
    logVerbose(`[Action] Wait For ${interval / 1000} seconds`);
    setInterval(async () => {
      const response = await lambda
        .getFunctionConfiguration({ FunctionName: functionName })
        .promise()
        .catch((e) => {
          throw e;
        });

      logVerbose(response);
      if (response.LastUpdateStatus === 'Successful') {
        return resolve(true);
      }
      console.log(`Lambda Last Update Status isn't \`Successful\`; Waiting ${interval / 1000}Sec before checking again...`);
    }, interval);
  });
}

function loadConfig(config, args = {}) {
  console.log('[Action] Load Config');
  if (!config) {
    throw new Error('Missing configuration object, unable to load the options.');
  }

  const readYaml = new Converter(config);

  let yamlPath = config.applicationYaml;
  // Variable to defined if using the SAM template near the lambda or the global application.yml file
  let local = false;

  const cwd = fs.readdirSync(process.cwd());
  const regex = new RegExp(config.lambdaTemplateRegex);

  const templateFound = cwd.filter((c) => regex.exec(c));
  logDebug(`Template Found (${templateFound.length}): ${templateFound}`);

  if (templateFound.length > 0) {
    if (templateFound.length > 1) {
      throw new Error(
        "Found more than one template, it will break the configuration, please update the 'lambdaTemplateRegex' to find only one template.",
      );
    }
    logDebug('Using lambda local template file');

    yamlPath = process.cwd() + path.sep + templateFound[0];
    logVerbose(yamlPath);
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
    if (!converted.Code) {
      throw new Error('Code not found in configuration.');
    }
    return (
      converted.Code.includes(`${path.sep}${configPath}${path.sep}`) ||
      (local && converted.Code.includes(`.${path.sep}${getZipFileName(args)}`))
    );
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
    logDebug('[Action] List Versions');
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
  logDebug('[Action] Get Latest Version');
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
    logDebug('[Action] Check if serverless exists');
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
  logDebug('[Action] Get Lambda Info using the serverless.json file');
  const info = fs.readFileSync('./serverless.json', { encoding: 'utf-8' });
  return JSON.parse(info);
}

/**
 * Publish or Package the lambda function
 */
async function publish(args, config = {}) {
  console.log('[Action] Lambda package and configuration');
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

  gitResponse = shell.exec('git rev-parse HEAD | cut -c1-8', { silent: !DEBUG });
  if (gitResponse.code !== 0) {
    console.error(gitResponse.stderr);
    throw new Error('You must upgrade your git version.');
  }
  const lastCommitId = gitResponse.stdout || process.env.USER || 'unknown-commit-id';

  shell.echo('Check if serverless.json exists or use the cloudformation as source of configuration...'.info);
  let info = {};
  if (args['use-yaml']) {
    logDebug('[Action] Use YAML');
    try {
      info = loadConfig(config, args);
      logVerbose(info);
    } catch (e) {
      logDebug(e);
      throw e;
    }

    // Only for informative purpose
    if (args['info-only']) {
      logDebug('[Action] Info Only');
      console.log(JSON.stringify(info, null, 2));
      process.exit(0);
    }
  } else if (CheckIfServerlessExists()) {
    info = GetLambdaInfo();
  } else {
    if (!args['package-only']) {
      throw new Error('Please configure the aws command manually or create a serverless.json, or --use-yaml to use the config service.');
    }

    console.log(
      `INFO: No Configuration loaded, if you are using \`--package-only\`, please use \`--zip-args\` to package your lambda properly,\n
      otherwise it will fallback to use the .npmignore.`,
    );
  }

  let functionName = info.FunctionName;
  if (args.stage) {
    shell.echo(`Override Function Name to ${functionName}-${args.stage}`);
    functionName += `-${args.stage}`;
  }

  shell.echo('> Collecting function configuration'.info);
  const updateCreateFnParams = {
    FunctionName: functionName,
    Description: `${info.Description} (${process.env.AWS_BRANCH_NAME || currentBranchName.replace('\n', '')}-${lastCommitId.replace(
      '\n',
      '',
    )}) at ${new Date().toISOString().replace(/[:.T]/g, '_')}`,
    Handler: info.Handler,
    MemorySize: info.MemorySize,
    Runtime: info.Runtime,
    Timeout: info.Timeout,
  };
  logDebug('> Collected function configuration');

  // Environment Variables
  if (info.Environment) {
    console.log('[Config] Update lambda Environment Configuration');
    updateCreateFnParams.Environment = {
      Variables: info.Environment.Variables || info.Environment,
    };
  }

  // VPC Configuration
  if (args.updateVpc || args['update-vpc']) {
    console.log('[Config] Update lambda VPC Configuration');
    updateCreateFnParams.VpcConfig = {
      SecurityGroupIds: info.vpcConfig.SecurityGroupsIds,
      SubnetIds: info.vpcConfig.SubnetIds,
    };
  }

  // Layers
  if (info.Layers && info.Layers.length > 0) {
    console.log('[Config] Update lambda Layer(s)');
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
    console.log('[Config] Update lambda Tracing Configuration');
    if (info.TracingConfig.Mode !== 'Active' && info.TracingConfig.Mode !== 'PassThrough') {
      throw new Error(`Invalid Tracing mode configuration, must be 'Active' or 'PassThrough', received ${info.TracingConfig.Mode}`);
    }
    updateCreateFnParams.TracingConfig = info.TracingConfig;
  }

  // Role
  if (args.updateRole || args['update-role']) {
    console.log('[Config] Update lambda Role');
    if (!args.role) {
      updateCreateFnParams.Role = `${info.Role['Fn::Sub'].replace(/\${AWS::AccountId}/, ACCOUNT_ID)}`;
    } else {
      logDebug(`Override role to ${args.role}`);
      updateCreateFnParams.Role = args.role;
    }
  }

  // Show config to be deployed then exit
  if (args['show-config']) {
    shell.echo('> Show Lambda Configuration');
    console.log(JSON.stringify(updateCreateFnParams, null, 2));
    process.exit(0);
  }

  shell.echo(`> Delete existing '${getZipFileName(args)}' file (if any)`.info);
  shell.rm('-f', getZipFileName(args));

  // This condition is in place to support nodejs only.
  // Yadu supports Python but we did a dirty fix, the configuration is the same for all runtime, this is why it works in our setup.
  // FIXME: It is not easy to work with something else dans NodeJS in this case.
  if (info && info.zipArgs && info.zipArgs.includes('node_modules')) {
    shell.echo('> Install NodeJs production packages'.info);
    shell.rm('-rf', 'node_modules');
    let verbosity = '';
    let timing = '';
    if (process.env.NO_NPM_LOG === '1' || process.env.NO_NPM_LOG === 'true') {
      verbosity = '--silent';
    }
    if (process.env.DEBUG === '1' || process.env.DEBUG === 'true') {
      verbosity = '--loglevel verbose';
    }
    if (process.env.TIMING === '1' || process.env.TIMING === 'true') {
      timing = '--timing';
    }
    // added --legacy-peer-deps to support NPM 7, in our case the peerDeps are provided by the layer in AWS
    shell.exec(`npm install ${verbosity} ${timing} --production --legacy-peer-deps`);
  } else {
    console.log(`${'----------'.warn}`);
    console.error(`${'[WARN]'.warn}YaDU is missing the zip source directories and files`);
    console.log(
      `${'[INFORMATION]'.info} Your lambda seems not using NodeJS, no other runtime implemented yet. (It might not work)
      It is triggered because the directory \`node_modules/\` is not specified in your YaDU configuration, 
      within the key \`zipArgs\` or
      you are not using the argument \`--zip-args\` or 
      it hasn't been loaded correctly.
      ${'You can safely ignore this, only if you know what you are doing.'.info}`,
    );
    console.log(`${'----------'.warn}\n`);
  }

  shell.echo('> Create Tag File'.info);
  // Delete old/existing commit id files
  shell.rm('-f', `_*_`);
  shell.touch({ '-d': new Date('2022-01-31') }, `_${lastCommitId.replace('\n', '')}_`);

  shell.echo('> Packaging lambda'.info);

  // The _*_ add the commit id to the lambda payload
  const zipCmd = `zip -X -D ${VERBOSE ? '-vvv' : '-q'} -r ${getZipFileName(args)} ${
    args['zip-args'] || info.zipArgs || defaultZip(process.cwd())
  } _*_`;
  logDebug(zipCmd);
  shell.exec(zipCmd);

  shell.echo('> Delete Tag File'.info);
  shell.rm(`_${lastCommitId.replace('\n', '')}_`);

  if (args.deploy && !args.create) {
    shell.echo('> Uploading code and configuration to AWS'.info);

    logDebug('AWS SDK : Update Function Code');
    const dataUpdateFunctionCode = await lambda
      .updateFunctionCode({
        FunctionName: functionName,
        Publish: args.publish || false,
        ZipFile: fs.readFileSync(path.resolve(process.cwd(), getZipFileName(args))),
      })
      .promise()
      .catch((e) => {
        throw e;
      });

    logDebug('Wait for Successful Status');
    await waitFor(functionName).catch((e) => {
      throw e;
    });

    logDebug(dataUpdateFunctionCode);

    if (!args['skip-update-config']) {
      shell.echo('> Deploy the lambda configuration');
      logDebug('Update Function Configuration');
      const dataUpdateFunctionConfiguration = await lambda
        .updateFunctionConfiguration(updateCreateFnParams)
        .promise()
        .catch((e) => {
          throw e;
        });
      logDebug(args, dataUpdateFunctionConfiguration);
    } else {
      logDebug(`Skipping updating configuration for ${info.FunctionName}`);
    }
  }

  if (args.create && args.role) {
    shell.echo('> Create the lambda function');
    logDebug(`Using this Role: ${args.role}`);
    logDebug(`Using this zip file: ${path.resolve(process.cwd(), getZipFileName(args))}`);
    const createNewFunction = await lambda
      .createFunction({
        ...updateCreateFnParams,
        Role: args.role,
        Code: {
          ZipFile: fs.readFileSync(path.resolve(process.cwd(), getZipFileName(args))),
        },
      })
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
    logDebug('Wait for Successful Status');
    await waitFor(functionName).catch((e) => {
      throw e;
    });
    logDebug('AWS SDK : Publish Version');
    const { Version } = await lambda
      .publishVersion({
        FunctionName: functionName,
      })
      .promise()
      .catch((e) => {
        throw e;
      });

    logDebug(`Version: ${Version}`);

    logDebug('Wait for Successful Status');
    await waitFor(functionName).catch((e) => {
      throw e;
    });

    logDebug('AWS SDk Update Alias');
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

    logDebug('Wait for Successful Status');
    await waitFor(functionName).catch((e) => {
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
  if (process.env.CI !== 'true') {
    shell.echo('> Restore the devDependencies'.info);
    shell.exec('npm install');
  }

  if (config && config.telemetry) {
    await sendTelemetry(config.telemetry.endpoint, config.telemetry.apiKey, config.telemetry.project);
  }

  shell.echo('Voila !\n Good Job !'.success);
}

module.exports = {
  listVersions,
  getLatestVersion,
  CheckIfServerlessExists,
  GetLambdaInfo,
  publish,
};
