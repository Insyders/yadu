describe('Testing trim', () => {
  test('trim on random data', async () => {
    const validations = [
      {
        currentBranchName: 'main',
        lastCommitId: '0123abc',
        expv1: 'main_0123abc',
        expv2: 'main_0123abc',
      },
      {
        currentBranchName: 'master',
        lastCommitId: 'abc123',
        expv1: 'master_abc123',
        expv2: 'master_abc123',
      },
      {
        currentBranchName: 'feat/test',
        lastCommitId: 'e12bcs',
        expv1: 'feat/test_e12bcs',
        expv2: 'test_e12bcs',
      },
      {
        currentBranchName: '@feat/something',
        lastCommitId: '0123543',
        expv1: '@feat/something_0123543',
        expv2: 'something_0123543',
      },
      {
        currentBranchName: 'feat/something',
        lastCommitId: '6e1234',
        expv1: 'feat/something_6e1234',
        expv2: 'something_6e1234',
      },
      {
        currentBranchName: 'feat/something',
        lastCommitId: '6e1234\n',
        expv1: 'feat/something_6e1234',
        expv2: 'something_6e1234',
      },
      {
        currentBranchName: 'fix/something',
        lastCommitId: '\n6e1234',
        expv1: 'fix/something_6e1234',
        expv2: 'something_6e1234',
      },
      {
        currentBranchName: 'feat/something',
        lastCommitId: '\t6e1234',
        expv1: 'feat/something_6e1234',
        expv2: 'something_6e1234',
      },
      {
        currentBranchName: 'release/something',
        lastCommitId: ' 6e1234',
        expv1: 'release/something_6e1234',
        expv2: 'something_6e1234',
      },
      {
        currentBranchName: 'release/something\n',
        lastCommitId: ' 6e1234',
        expv1: 'release/something_6e1234',
        expv2: 'something_6e1234',
      },
    ];

    validations.forEach((element) => {
      element.currentBranchName = element.currentBranchName.trim();
      element.lastCommitId = element.lastCommitId.trim();
      const v1 = `${element.currentBranchName}_${element.lastCommitId}`;
      const v2 = `${element.currentBranchName.split('/')[1] ?? element.currentBranchName}_${element.lastCommitId}`;
      expect(v1).toEqual(element.expv1);
      expect(v2).toEqual(element.expv2);
    });
  });
});
