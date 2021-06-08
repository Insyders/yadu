const fs = require('fs');
const path = require('path');
const { processHistory } = require('../../liquibase/src/utils');

describe('Test processing history data from liquibase history command', () => {
  test('History command processing', () => {
    //   Load Mock to confirm the function behaviour
    const processing = processHistory(fs.readFileSync(path.join(__dirname, 'history.log')));

    expect([...processing]).toEqual([
      'mysql/changelog/db.changelog-abc-123.mysql.sql',
      'mysql/changelog/db.changelog-abc-124.mysql.sql',
      'mysql/changelog/db.changelog-abc-125.mysql.sql',
    ]);
  });
});
