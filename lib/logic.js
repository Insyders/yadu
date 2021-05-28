const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const shell = require('shelljs');
const { getAccountId } = require('./utils');

const lambda = new AWS.Lambda();
const sts = new AWS.STS();

function logDebug(args, message) {
  // Helpers
  return (args.debug || process.env.DEBUG) && console.log(message);
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
    console.error(`${e.message}`.error);
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
async function publish(args) {
  // If we want to override the layerVersion maybe useful for testing, multi-region/multi-account for CD
  const DEBUG = args.debug || process.env.DEBUG;
  const REGION = args.region || process.env.AWS_REGION || process.env.REGION || null;
  const LAYER_VERSION = process.env.LAYER_VERSION || args.layerVersion || args['layer-version'];
  const ACCOUNT_ID = getAccountId(args, sts);

  shell.echo('Retrieve current branch name and last Commit Id'.info);
  let gitResponse = shell.exec('git branch --show-current', { silent: !DEBUG });
  if (gitResponse.code !== 0) {
    console.error(gitResponse.stderr);
    throw new Error('You must upgrade your git version.');
  }
  const currentBranchName = gitResponse.stdout;

  gitResponse = shell.exec('git rev-parse --short HEAD', { silent: !DEBUG });
  if (gitResponse.code !== 0) {
    console.error(gitResponse.stderr);
    throw new Error('You must upgrade your git version.');
  }
  const lastCommitId = gitResponse.stdout;

  shell.echo('Check if serverless.json exists...'.info);
  if (CheckIfServerlessExists()) {
    const info = GetLambdaInfo();

    let functionName = info.FunctionName;
    if (args.stage) {
      console.log(`Override Function Name to ${functionName}-${args.stage}`);
      functionName += `-${args.stage}`;
    }

    shell.echo("> Delete existing 'index.zip' file (if any)".info);
    shell.rm('index.zip');

    if (info.zipArgs.includes('node_modules')) {
      shell.echo('> Install NodeJs production packages'.info);
      shell.rm('-rf', 'node_modules');
      shell.exec('npm install --silent --production');
    }

    shell.echo('> Create Tag File'.info);
    shell.touch(`_${lastCommitId.replace('\n', '')}_`);

    shell.echo('> Packaging lambda'.info);
    shell.exec(`zip -X -q -r index.zip ${info.zipArgs} _*_`);

    shell.echo('> Delete Tag File'.info);
    shell.rm(`_${lastCommitId.replace('\n', '')}_`);

    if (args.deploy) {
      shell.echo('> Updating code to AWS'.info);

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

      console.log(dataUpdateFunctionCode);

      shell.echo('> Updating function configuration'.info);
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

      // Environment Variables
      if (info.Environment) {
        updateCreateFnParams.Environment = {
          Variables: info.Environment.Variables || info.Environment,
        };
      }

      // VPC Configuration
      if (args.updateVpc || args['update-vpc']) {
        updateCreateFnParams.VpcConfig = {
          SecurityGroupIds: info.vpcConfig.SecurityGroupsIds,
          SubnetIds: info.vpcConfig.SubnetIds,
        };
      }

      // Layers
      if (info.Layers && info.Layers.length > 0) {
        let layers = [];
        if (!args.layers) {
          info.Layers.forEach((layer) => {
            if (typeof layer === 'string') {
              let localLayer = layer.replace(/\${AWS::AccountId}/, ACCOUNT_ID).replace(/\${AWS::Region}/, REGION);

              if (LAYER_VERSION) {
                shell.echo(`> Overriding the Layer version to ${LAYER_VERSION}`.info);
                localLayer = localLayer.replace(/[0-9]*$/, LAYER_VERSION);
              }

              layers.push(localLayer);
            } else {
              console.error('The layer type is different than string, the layer will not be attached.'.warn);
            }
          });
        } else {
          console.log(`Override Layers to ${args.layers.split(',')}`);
          layers = args.layers.split(',');
        }

        updateCreateFnParams.Layers = layers;
      }

      // X-Ray
      if (info.TracingConfig) {
        updateCreateFnParams.TracingConfig = info.TracingConfig;
      }

      // Role
      if (args.updateRole || args['update-role']) {
        if (!args.role) {
          updateCreateFnParams.Role = `${info.Role['Fn::Sub'].replace(/\${AWS::AccountId}/, ACCOUNT_ID)}`;
        } else {
          console.log(`Override role to ${args.role}`);
          updateCreateFnParams.Role = args.role;
        }
      }

      if (args.deploy) {
        const dataUpdateFunctionConfiguration = await lambda
          .updateFunctionConfiguration(updateCreateFnParams)
          .promise()
          .catch((e) => {
            throw e;
          });
        logDebug(args, dataUpdateFunctionConfiguration);
      }

      if (args.create) {
        const createNewFunction = await lambda
          .createFunction(updateCreateFnParams)
          .promise()
          .catch((e) => {
            throw e;
          });
        // TODO : add permission ! (apigateway invoke and all that stuff)
        // TODO : Create alias !
        logDebug(args, createNewFunction);
      }
    }

    if (args.newVersion || args['new-version']) {
      console.debug('Create a new version');
      const { Version } = await lambda
        .publishVersion({
          FunctionName: functionName,
        })
        .promise();

      console.log(Version);

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

    shell.echo('Voila !'.success);
  } else {
    throw new Error('Please configure the aws command manually or create a serverless.json (Preferred).');
  }
}

module.exports = {
  listVersions,
  getLatestVersion,
  CheckIfServerlessExists,
  GetLambdaInfo,
  publish,
};
