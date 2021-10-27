const CodePipeline = require('../../libs/classes/CodePipeline');

const c = new CodePipeline();

describe('Test Codepipeline functions', () => {
  test.skip('Get stack info', async () => {
    const t = await c.GetCurrentParameters(process.env.STACK_NAME);

    console.debug(t);
  });

  test.skip('update branch name', async () => {
    const t = await c.UpdateBranchName(process.env.STACK_NAME, 'BranchName', process.env.BRANCH_NAME);

    console.debug(t);
  });
});
