# Lambda

It uses the `serverless.json` file that has been created along with each lambdas.
That allows you to easily deploy your local code to an AWS account.

## Usage

### Deploy a lambda to $LATEST

```
yadu --deploy
```

### Package a lambda

It only creates the zip file and you need to import it manually on AWS console

```
yadu --package-only
```

### Deploy on an infrastructure that uses SAM & CloudFormation

> Don’t forget to replace the `$STAGE` and `$LAYER_ARN` with your information

```
yadu \
  --deploy \
  --region=us-east-1 \
  --new-version \
  --alias=live \
  --stage=$STAGE \
  --layers=$LAYER_ARN
```

 - This command will package and deploy the lambda code to AWS, then it will create a new version and attach it to the alias named ‘live’.
 - The layers are optionals.
- In the ***SAM / CloudFormation*** infrastructure, the $LATEST isn’t use anymore. All lambda will exist per stage. This is why we use ‘live’ for the alias name.
- The best practices, recommend to use a different AWS account per environment.

### Create a new lambda

**Not yet available**

``` bash
yadu --create
```

### Attach the newly created version to a specific alias

```bash
yadu --attach=$STAGE
```

### Override lambda configurations

You can specify these parameters : 

### Role:

```
--role='IAM_ARN' --update-role
```
### Layer:

```
--layer-version='INTEGER'
--layers="LAYER_ARN,LAYER_ARN2,..."
```

### Account ID:

```
--account-id='AWS_ACCOUNT_ID'
```

### VPC:

In the Serverless.json file you can define a custom VPC configuration

```
--update-vpc
```

## Configuration

For the `zipArgs` parameter, noticed the lowercase **z**, this is intended

> Do not add extra parameters, I have to update a script to avoid errors. 
> So let me know if you need extra params, 
> It will be my pleasure to update the scripts.

Complete Example:
```json
{
    "FunctionName": "integration-template",
    "Description": "This is a template for devops integration",
    "Code": "./_integration/index.zip",
    "Handler": "index.handler",
    "Runtime": "nodejs12.x",
    "MemorySize": 128,
    "Timeout": 3,
    "Layers": [
        "LAYER_ARN"
    ],
    "zipArgs": "*.js package.json *.html node_modules",
    "Environment": {
        "FOO": "BAR",
        "BAR": "FOO"
    },
    "Role": "LAMBDA_ROLE_ARN",
    "Events": {
        "dev": {
            "EventSourceArn": {
                "Fn::Sub": "arn:aws:sqs:${AWS::Region}:${AWS::AccountId}:sqs_example_dev"
            },
            "BatchSize": 10,
            "Enabled": true
        }
    },
    "Permissions": {
        "dev": [
            {
                "Type": "AWS::Lambda::Permission",
                "Properties": {
                    "Action": "lambda:InvokeFunction",
                    "FunctionName": {
                        "Fn::Sub": "arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:FUNCTION_NAME:dev"
                    },
                    "Principal": "apigateway.amazonaws.com",
                    "SourceArn": {
                        "Fn::Sub": "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:*/*"
                    }
                }
            }
        ]
    }
}
```

## Promote a lambda

> When using aliases with your lambdas, you might want to promote them from $LATEST to a specific alias.

```
yadu \
  --deploy \
  --region=<REGION> \
  --new-version \
  --alias=<ALIAS_NAME>
```

> It uses the `serverless.json` file.

This command will **package** and **deploy** your local changes to the `$LATEST` version.
Then the `--new-version` will create a version based on what is in `$LATEST`.
And the `--alias` will attach the new version to the specified alias name.