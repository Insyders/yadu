# MySQL, Migrations and Liquibase

Those commands simply wrapped the liquibase tool.

- [Liquibase](https://www.liquibase.org)

## Installation

- Install Java

## Usage

### Generate main file (main.xml)

That file is used to manage your databse to sync the appropriate migrations.

```bash
--generate-main
```

It requires to pass the **target database** and a **second database (ref)** to compare the changes and generate the migration file (`db.changelog-main.xml`).

The comparaison process is done like that : 

1. Get history of migrations using the **ref** database
2. Compare that history to the local migration(s) available (in your current git branch)
3. Generate the `db.changelog-main.xml` that fit your current configuration

in summary, you need to define these variables: 
```text
DB_USER="<DB_USER>"
DB_PASS="<DB_PASS>"
DB_URL="jdbc:mysql://<DB_URL>:3306/<DATABASE_NAME>?useUnicode=true&characterEncoding=UTF-8"
DB_USER_REF="<DB_USER_REF>"
DB_PASS_REF="<DB_PASS_REF>"
DB_URL_REF="jdbc:mysql://<DB_URL_REF>:3306/<DATABASE_NAME_REF>?useUnicode=true&characterEncoding=UTF-8"
```

> The `db.changelog-main.xml` can be commited to the repository, but it is not necessary. 
> It should always be regenerated to fit the current schema configurations to avoid misconfigurations.

### Create Migration

This simple command creates the placeholder template for you.

The idea here is to create a migration using the feature branch name (example : feature/ABC-1)

```bash
--create-migration --name ABC-1
```

The file will be named : `db.changelog-abc-1.mysql.sql`

- The idea is to use that file to handle all migrations that is part of this feature, hotfix, fix and others branch name. In other words, the migrations will always be attached to a branch.
- It is also important to fill the placeholder correctly to help your colleagues to track changes quickly and easily.
- What to do if I have multiple changes to do ?
  - You only need to copy the template (from `changeset` -> `rollback`) and fill the information.

#### The placeholder (liquibase structure):

```sql
-- liquibase formatted sql

-- changeset tommygingras:1620070899971-[create|update|insert|etc.]-[tableName]-[extraInfo]
-- comment [Put a human readable description]
[RAW SQL GOES HERE]
-- rollback [RAW SQL THAT ROLLBACKS THE SQL]
```

- The ***first line*** is used for liquibase : `-- liquibase formatted sql`
- The ***second line*** is the id use in the changelog table : `changeset name:[create|update|insert|etc.]-[tableName]-[extraInfo]`
  - That id must contains your name
  - Then our approach for the actual id is to use the [ACTION]-[TABLE_NAME]-[EXTRA]
  - That way by reading the id we have a better idea of what it is done
- The ***third line*** is the human readable comment
- The ***fourth line/section*** is used to write your own Raw SQL
- The ***last line*** is used to rollback you SQL command. It is not mandatory but strongly recommended to define the exact command to apply, it is useful when developing.

[Official Documentation / Samples](https://docs.liquibase.com/concepts/basic/sql-format.html)

### Deploy Migration

Your migrations are written and you are ready to deploy the changes to the database.

> By default, all commands are executed using the **dry-run** argument enabled.

This command will run in dry-run and will print the SQL that will be run :

```bash
--deploy-migration \
    --name=ABC-1 \
    --env=development
```

To run the real command : 

```bash
--deploy-migration \
    --name=ABC-1 \
    --env=development \
    --no-dry-run
```

In this example, all migrations defined in `db.changelog-abc-1.mysql.sql` will be run on the database defined in the `.env.development` configuration file.


Alternatives : 

Using the environment variables:

```bash
export DB_URL=""
export DB_USER=""
export DB_PASS=""
export API_KEY=""
export PROJECT_ID=""

yadu --deploy-migration \
    --name=ABC-1
```

Using the secret manager:

```bash
yadu --deploy-migration \
    --name=ABC-1 \
    --secrets="db-dev"
```

### Create Version

```bash
yadu --create-version \
    --version="1.1.0"
```

> You can use the same approach as the `--deploy-migration` to load the configuration.

It takes a snapshot of the current database and creates a file using the version.   

The filename format is  `db.changelog-1.1.0.mysql.sql`, it strips all rollbacks, comments and it generates incremental id using your username with a timestamp.  

The goal of this command is to create a database with a specific version.  
Each time you deploy a version, I'll suggest to run that command to get a "backup" of your schema.

### diff

List the differences between 2 databases.

```bash
yadu --diff
```

It requires the `DB_URL_REF`, `DB_USER_REF` & `DB_PASS_REF`

### rollback

In the changelog table, there is a column 'tag', it is used to allow us to rollback to a specific state.

```bash
yadu --rollback \
    --name=ABC-1
    --tag=develop-12ab34cd
```

> The tags are created using the current branch name followed by the last commit id.

For the rollback to be applied you need two things.

1. The changelog and its migration(s) to rollback, and of course a rollback command defined for each changeset.
2. The tag, it can be found in the database directly.

> Always run a dry-run and double check the Raw SQL that will be launched.

like the deploy command, by default, the **dry-run** is enabled.

To execute it for real:

```bash
yadu --rollback \
    --name=ABC-1
    --tag=develop-12ab34cd
    --no-dry-run
```

### Synchronize a branch and a database

This command deploys to a target database all migrations that needs to be ran.

To determine which migrations are required, 
1. The script load the history of the reference database
2. Compare the return with the local migrations that exist in your branch. 
3. Then it generates a main.xml file.

That main.xml file contains everything to sync the target database.

For example,

You want to sync a release to the stage environment.

QA      -> Stage
Develop -> release/v1.0

QA DB has all migrations ran.

1. Set the target database to : `STAGE`
2. Set the reference database to : `development`.

Then run the --sync command using the release/v1.0 branch. 
Automatically, all required migrations will be added to the main.xml file.

> So that means that if a developer is working on a feature branch that have altered the `development` schema, that changes will not be part of the migration in the release, because locally the migration doesn't exist.

```bash
export DB_URL="jdbc:mysql://localhost:3306/tg-qa?useUnicode=true&characterEncoding=UTF-8"
export DB_USER="admin"
export DB_PASS="password123"
export DB_URL_REF="jdbc:mysql://localhost:3306/tg-dev?useUnicode=true&characterEncoding=UTF-8"
export DB_USER_REF="admin"
export DB_PASS_REF="password321"

yadu --sync
```

### clear

**Advanced usage only**, it clears all checksums in the target database. 
> You should only use it if you really need to reset the checksums.

Useful when your migration has been ran and you made a typo in a file that will block further execution.

> Before using this command, please double check with your database expert.

## Configuration

### .env or Secret Manager Configuration

> I strongly recommend to use the secret manager for the configuration if possible.
```text
DB_USER="<DB_USER>"
DB_PASS="<DB_PASS>"
DB_URL="jdbc:mysql://<DB_URL>:3306/<DATABASE_NAME>?useUnicode=true&characterEncoding=UTF-8"
DB_USER_REF="<DB_USER_REF>"
DB_PASS_REF="<DB_PASS_REF>"
DB_URL_REF="jdbc:mysql://<DB_URL_REF>:3306/<DATABASE_NAME_REF>?useUnicode=true&characterEncoding=UTF-8"
```

#### Optional:

Your liquibase hub Project ID and API Key, (if any)
```text
PROJECT_ID="<LIQUIBASE_HUB_PROJECT_ID>"
API_KEY="<LIQUIBASE_HUB_API_KEY>"
```

> By default, it uses the configuration that is provided with this package.
```text
LIQUIBASE_CONF_PATH="<ABSOLUTE_PATH>/liquibase.properties"
LIQUIBASE_BASE_PATH="<ABSOLUTE_PATH>/liquibase-4.3.3/./liquibase"
BASE_PATH="./mysql/changelog"
```