const {
  RDSClient,
  RestoreDBInstanceFromDBSnapshotCommand,
  CreateDBSnapshotCommand,
  DeleteDBInstanceCommand,
  waitUntilDBInstanceAvailable,
  waitUntilDBSnapshotAvailable,
  waitUntilDBInstanceDeleted,
} = require('@aws-sdk/client-rds');

const client = new RDSClient();

module.exports = class Database {
  constructor(config = {}) {
    console.debug(config);
    this.target = config.target;
    this.snapshotNameTarget = config.snapshotNameTarget;
    this.snapshotNameSource = config.snapshotNameSource;
    this.deleteAutomatedBackups = config.deleteAutomatedBackups === true;

    this.dbInstanceClass = config.dbInstanceClass || 'db.t3.micro';
    this.publiclyAccessible = config.publiclyAccessible === true;
  }

  async deleteInstance(target = null, waitForReturn = true) {
    console.debug(`target: ${target}` || this.target);
    console.debug(`deleteAutomatedBackups: ${this.deleteAutomatedBackups}`);

    const response = await client.send(
      new DeleteDBInstanceCommand({
        DBInstanceIdentifier: target || this.target,
        DeleteAutomatedBackups: this.deleteAutomatedBackups,
        SkipFinalSnapshot: true, // Not handled for now, because not needed for us.
      }),
    );

    console.log(response);
    if (waitForReturn) {
      console.debug('Wait until instance deletion done');
      await waitUntilDBInstanceDeleted({ client, maxWaitTime: 3600 }, { DBInstanceIdentifier: target || this.target });
    }
  }

  async restoreDbFromSnapshot(target = null, snapshotNameSource = null, waitForReturn = true) {
    console.debug(`target: ${target}` || this.target);
    console.debug(`snapshotNameSource: ${snapshotNameSource}` || this.snapshotNameSource);
    console.debug(`dbInstanceClass: ${this.dbInstanceClass}`);
    console.debug(`publiclyAccessible: ${this.publiclyAccessible}`);

    console.log(this);
    const response = await client.send(
      new RestoreDBInstanceFromDBSnapshotCommand({
        DBInstanceIdentifier: target || this.target,
        DBSnapshotIdentifier: snapshotNameSource || this.snapshotNameSource,
        AutoMinorVersionUpgrade: true,
        DBInstanceClass: this.dbInstanceClass,
        PubliclyAccessible: this.publiclyAccessible,
      }),
    );

    console.log(response);

    if (waitForReturn) {
      console.debug('Wait until instance available');
      await waitUntilDBInstanceAvailable({ client, maxWaitTime: 3600 }, { DBInstanceIdentifier: target || this.target });
    }
  }

  async createDbSnapshot(target = null, snapshotNameTarget = null, waitForReturn = true) {
    const response = await client.send(
      new CreateDBSnapshotCommand({
        DBInstanceIdentifier: target || this.target,
        DBSnapshotIdentifier: snapshotNameTarget || this.snapshotNameTarget,
      }),
    );

    console.log(response);

    if (waitForReturn) {
      console.debug('Wait until snapshot done');
      await waitUntilDBSnapshotAvailable(
        { client, maxWaitTime: 3600 },
        { DBSnapshotIdentifier: snapshotNameTarget || this.snapshotNameTarget },
      );
    }
  }
};
