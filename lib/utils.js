const shell = require('shelljs');

/**
 * Get AWS Account Id
 */
async function getAccountId(args, sts) {
  shell.echo(`${'[AWS]'.debug} Get Account Id`);
  let accountInfo = null;
  let accountInfoJson = {};

  if (!args.accountId || !args['account-id']) {
    accountInfo = await sts
      .getCallerIdentity({})
      .promise()
      .catch((e) => {
        throw e;
      });
    accountInfoJson = accountInfo.Account;
  }
  console.debug(args.accountId || args['account-id'] || accountInfoJson);
  return args.accountId || args['account-id'] || accountInfoJson;
}

/**
 * It checks if the zip command is installed.
 */
function checkZIPCLI() {
  shell.echo(`${'[VALIDATION]'.verbose} Check if ZIP is installed`);
  if (!shell.which('zip')) {
    shell.echo(`${'[Fail]'.error} Sorry, this script requires the \`zip\` command`);
    shell.exit(1);
  }
  shell.echo(`${'[Done]'.success} Zip installed.`);
}

/**
 * It checks if the git command is installed.
 */
function checkGITCLI() {
  shell.echo(`${'[VALIDATION]'.verbose} Check if GIT is installed`);
  if (!shell.which('git')) {
    shell.echo(`${'[Fail]'.error} Sorry, this script requires the \`git\` command`);
    shell.exit(1);
  }
  shell.echo(`${'[Done]'.success} Git installed.`);
}

/**
 * It checks if the AWS CLI is installed.
 */
function checkAWSCLI() {
  shell.echo(`${'[VALIDATION]'.verbose} Check if AWS CLI is installed`);
  if (!shell.which('aws')) {
    shell.echo(`${'[Fail]'.error} Sorry, this script requires \`aws\` cli`);
    shell.echo('https://aws.amazon.com/cli/');
    shell.exit(1);
  }
  shell.echo(`${'[Done]'.success} AWS installed.`);
}

module.exports = {
  getAccountId,
  checkGITCLI,
  checkZIPCLI,
  checkAWSCLI,
};
