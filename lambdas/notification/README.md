# notification

```bash
export AWS_PROFILE="dev"
export AWS_REGION="us-east-1"
export PROJECT_NAME="devops"
export SNS_ARN="arn:aws:sns:${AWS_REGION}:${ACCOUNTID}:Pipeline_Notification_v2"
export INFRA_BUCKET="devops-infra-${PROJECT_NAME}-${AWS_REGION}"

sam build

sam deploy \
    --profile="$AWS_PROFILE" \
    --region="$AWS_REGION" \
    --s3-bucket $INFRA_BUCKET \
    --stack-name "$PROJECT_NAME-notifications" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides \
        DebugEnabled="true" \
        SnsArn="$SNS_ARN"
```

```bash
aws lambda invoke --profile $AWS_PROFILE --region $AWS_REGION --function-name devops-notifications --payload $(echo -n '{"foo": "bar"}' | base64) response.json
```