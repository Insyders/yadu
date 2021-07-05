# Lambdas

## Prerequisites

- NodeJS >= 12
- zip Command
- git Command
- npm Command 
- serverless.json file or template.yml/yaml or application.yaml
- (Optional) configuration service
- export AWS_SDK_LOAD_CONFIG=1
- export AWS_PROFILE=custom_profile (or default)
- export AWS_REGION=us-east-1 (or other)

## Commands

| Commands            | Options               | Description                                                                                                                                  |
|---------------------|-----------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| --deploy            |                       | Deploy your local code to AWS                                                                                                                |
|                     | --use-yaml            | It reads the local template.yml or template.yaml and if not found it uses the YAML file configured in the config service (`applicationYaml`) |
|                     | --env=\<String\>      | It specifies which configuration to use (example: `.yadu/dev.json`, `.yadu/qa.json`, `.yadu/etc.json`)                                       |
|                     | --new-version         | It publishes a new version based on `$LATEST`                                                                                                |
|                     | --alias=\<String\>    | It attaches the new version to the specified alias                                                                                           |
| --package-only      |                       | Package the lambda locally and generate an `index.zip` file                                                                                  |
|                     | --use-yaml            | It reads the local template.yml or template.yaml and if not found it uses the YAML file configured in the config service (`applicationYaml`) |
| --attach=\<String\> |                       | Attach the `$LATEST` to the specified alias                                                                                                  |
| --new-version       |                       | Create a new Version based on current `$LATEST` code and configuration                                                                       |
|                     | --alias=\<String\>    | Alias to attach the new version                                                                                                              |
| --template          |                       | Create a template.yml for a lambda, it includes an alarm, a log group & a SAM definition                                                     |
| --init              |                       | Create the `.yadu/` directory and generate an empty configuration file (`.yadu/config.json`)                                                 |
|                     | \[--interactive\]     | Use an interactive shell to create the default configuration                                                                                 |
| --cloudformation    |                       | Concatenate all template.yml with the specified application.yaml file.                                                                       |
|                     | --filename=\<String\> | Output filename                                                                                                                              |
  
## Configurations

### Use a serverless.json file

This file contains the lambda configuration and some options. It can be use without the config service

<details open>
  <summary>Basic example:</summary>
  
```json
{
    "FunctionName": "yadu-lambda-name",
    "Description": "lambda description",
    "Code": "./yadu-lambda-name/index.zip",
    "Handler": "src/index.handler",
    "Runtime": "nodejs12.x",
    "MemorySize": 1024,
    "Role": {
        "Fn::Sub": "arn:aws:iam::${AWS::AccountId}:role/service-role/basic_lambda_execution"
    },
    "Timeout": 20,
    "Layers": [
      "arn:aws:lambda:us-east-1:123456789012:layer:node_modules:1"
    ],
    "zipArgs": "src/*.js package.json node_modules/"
}
```

</details>

### Use a template.yml file (preferred way)

It uses SAM and Cloudformation you can design that part like you usually do.

I'll recommend using the config service to be able to replace all the cloudformation intrinsic functions and references.

### Use an application.yaml file

This file is located at `cloudformation/application.yaml`

It contains all the basic resources, like the *API*, *layers* and *etc*.

you can also define all lambdas in that file, but it might be hard to maintain.
> YaDU offers a command to concatenate all template.yml from each lambdas with the application.yaml file.

I'll recommend using the config service to be able to replace all the cloudformation intrinsic functions and references.

### Summary
| Configuration    | Config service required | Description                                                                                                                                                        |
|------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| serverless.json  | No                      | This configuration is a standalone and not really compatible with SAM/Cloudformation, it requires to duplicate the configuration                                   |
| template.yml     | Yes                     | This configuration uses SAM/CloudFormation, so no copy/paste are required. YaDU provide a command to concatenate all configurations into the application.yaml file |
| application.yaml | Yes                     | All configurations are shared in the same file, it becomes hard to manage and maintain.                                                                            |


## The configuration service

This JSON configuration is stored in the `.yadu/` directory at the root of your project. 
Those files contain the configuration of each environment and can be use with `--env=<String>`

<details open>
  <summary>Example:</summary>
  
```json
{
  "debug": true,
  "region": "us-east-1",
  "layerVersion": null,
  "accountId": "123456789012",
  "stage": "dev",
  "lambdaBasePath": "../aws/lambda/",
  "layerBasePath": "./layer/node_modules.zip",
  "lambdaSourcePath": "./aws/lambda/",
  "lambdaTemplateRegex": "template.yaml|template.yml",
  "applicationYaml": "./cloudformation/application.yaml",
  "mapping": {
    "TracingMode": "Active",
    "${IAMStackName}:GenericLambdaRole": "arn:aws:iam::123456789012:role/generic-lambdaRole",
    "TracingMode": "Active",
    "NodeEnv": "development",
    "Stage": "dev",
    "DefaultHandler":"index.handler"
  },
  "secrets": "db-qa,db-dev:ref",
  "mysqlBasePath": "mysql/changelog/",
  "liquibaseBasePath": null,
  "liquibaseConfPath": null,
  "classPath": null,
  "zipArgs": "node_modules/ *.py *.js package.json *.html src/*.js lib/*.js",
  "mysqlDump": {
    "executable": null,
    "filename": "mysql/baseline/schema-dev-latest.sql",
    "options": "no-data,triggers,routines,events,all-databases,column-statistics=0"
  }
}
```

</details>

| Option                  | Description                                                                                                                           |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------|
| debug                   | To enable or Disable the debug output                                                                                                 |
| region                  | AWS Region                                                                                                                            |
| layerVersion            | To override the layer version in the serverless.json file                                                                             |
| accountId               | AWS Account Id                                                                                                                        |
| stage                   | The configuration environment                                                                                                         |
| lambdaBasePath          | A relative path from the application.yaml to find the lambdas                                                                         |
| layerBasePath           | The layer path                                                                                                                        |
| lambdaSourcePath        | The lambdas path from the root of the project                                                                                         |
| lambdaTemplateRegex     | Regex to determine the template.yaml file name                                                                                        |
| applicationYaml         | The path from the root of the project to the application.yaml file                                                                    |
| mapping                 | The Key/value mapping to replace the intrinsics and references variables in the cloudformation file                                   |
| secrets                 | It can have up to 2 values, the first one is the DB to update, and the second one is the reference (:ref), the `:ref` will add `_REF` |
| mysqlBasePath           | The directory that contains all changelogs (from the root of the project)                                                             |
| liquibaseBasePath       | To override the default liquibase installation path                                                                                   |
| liquibaseConfPath       | To override the default liquibase.properties path                                                                                     |
| classPath               | To override the default mysql connector path                                                                                          |
| zipArgs                 | Specify which file to archive, it determines the files that will be uploaded to AWS                                                   |
| mysqlDump               | See below                                                                                                                             |
| mysqlDump .. executable | To override the mysqlDump executable path                                                                                             |
| mysqlDump .. filename   | The relative path and filename to store the exported database output                                                                  |
| mysqlDump .. options    | The mysqlDump options                                                                                                                 |


## Examples

To print the configuration without pushing it on AWS:

```
yadu --show-config --use-yaml --env=dev-hs --verbose
```
