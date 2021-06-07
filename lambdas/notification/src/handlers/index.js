const logDebug = (...message) => (process.env.DEBUG === 'true' ? console.debug(...message) : null);

const AWS = require('aws-sdk');

const { SNS_ARN } = process.env;
const sns = new AWS.SNS();

exports.handler = async (event) => {
  try {
    logDebug(event);

    const payload = (event && typeof event === 'string' ? JSON.parse(event) : event) || null;

    if (!payload) {
      throw new Error('No payload sent.');
    }

    logDebug(payload);

    if (!SNS_ARN) {
      throw new Error('Missing `SNS_ARN` value from env.');
    }

    const response = await sns
      .publish({
        TopicArn: SNS_ARN,
        Message: JSON.stringify(payload),
      })
      .promise();

    logDebug(response);

    return {
      statusCode: 200,
      body: {
        message: `Notification sent with success to ${SNS_ARN}`,
        extra: response,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: {
        message: e.message,
      },
    };
  }
};
