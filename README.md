# YaDU (Yet another Deployment Utility)

<p align="center">
  <img alt="YaDU Logo" width="80%" src="./assets/HS_YaDU_Hor_color.svg">
</p>

## Introduction

***THIS IS STILL A WORK IN PROGRESS***

This tool is used to ***deploy***, ***upgrade*** and ***package*** AWS lambdas.
It also manage our ***MySQL migrations / Online Schema Changes*** using ***Liquibase*** CLI.

It is developed using **NodeJS** and **ShellJS** when it is not simple to use Javascript.

We planned to create a complete and intuitive tool to work alongside with SAM (from AWS)

## Installation

```bash
npm install -g @halfserious/yadu
```

Using root account or if you have a permission error:

```bash
npm install --unsafe-perm -g @halfserious/yadu
```

To skip the Liquibase Installation:

```bash
export SKIP_POST=1
npm install -g @halfserious/yadu
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

|     Priority     | Description                                               | Command                                     |
|:----------------:|-----------------------------------------------------------|---------------------------------------------|
| 4 (Loaded First) | Load data from your local environment variables           | `export FOO=BAR` or `SetX FOO BAR`          |
|        3         | Load data from AWS secret manager into your `process.env` | `--secret=<String,String,...>`              |
|        2         | Load data from local `.env.environment` file              | `NODE_ENV="<String>"` or `--env="<String>"` |
| 1 (Loaded Last)  | Override using the arguments (Check the CLI commands)     | `--help`                                    |

## Support

### MacOs & Linux

Linux (Docker) : `npm install -g --unsafe-perm @halfserious/yadu`

On MacOS : `npm install -g @halfserious/yadu`

### Windows

Tested on windows 10 using 
- Git bash
- Powershell

`npm install -g @halfserious/yadu`


## Contribution

All contributions are welcome ! 
We use the issues to track Feature requests, bugs and others.

We are still working on the core of this utility, so it is possible that breaking changes will be published.