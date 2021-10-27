const Database = require('../../classes/Database');

module.exports = async (args, config = {}) => {
  const client = new Database(config);

  if (args['create-db-snapshot']) {
    await client.createDbSnapshot(args.target, args['snapshot-name-target']);
    return true;
  }

  if (args['restore-db-from-snapshot']) {
    await client.restoreDbFromSnapshot(args.target, args['snapshot-name-source']);
    return true;
  }

  if (args['delete-db-instance']) {
    await client.deleteInstance(args.target);
    return true;
  }

  return false;
};
