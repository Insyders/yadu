# YaDU (Yet another Deployment Utility)

**THIS IS STILL A WORK IN PROGRESS**

This internal tool is used to deploy, upgrade and package your lambdas.
It also manage our MySQL migrations using Liquibase CLI.

## Installation

```bash
npm install -g @halfserious/yadu
```

Using root account or if you have a permission error:

```bash
npm install --unsafe-perm -g @halfserious/yadu
```

## Usage

For specific documentation:

- [Lambda](docs/lambda.md)
- [MySQL/Migrations/Liquibase](docs/mysql.md)


### Get CLI help

```
yadu --help
```

### Use an AWS profile

```bash
yadu --profile='profile_name'
```

alternatives:
- `export AWS_PROFILE=""`
- `export PROFILE=""`
- By default, it uses 'default'


### Specify a region

```bash
yadu --region='us-east-1'
```

alternatives:
- `export AWS_REGION=""`
- `export REGION=""`
- By default, it uses 'us-east-1'

## Configuration

It uses the **environment variables**, **AWS Secret Manager**, **Local .env** and **arguments**

| Priority | Description                                             | Command                                     |
|:--------:|---------------------------------------------------------|---------------------------------------------|
|    1     | Load data from your environment variables               | `export FOO=BAR`                            |
|    2     | Load data from AWS secret manager in your `process.env` | `--secret=<String,String,...>`              |
|    3     | Load data from local `.env.environment` file            | `NODE_ENV="<String>"` or `--env="<String>"` |
|    4     | Override using the arguments (Check the CLI commands)   | `--help`                                    |

## Support

### MacOs & Linux

Linux (Docker) : `npm install -g --unsafe-perm @halfserious/yadu`

On MacOS : `npm install -g @halfserious/yadu`

### Windows

Tested on windows 10 using 
- Git bash
- Powershell

`npm install -g @halfserious/yadu`


