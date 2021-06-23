exports.handler = async (event, context) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  // log.verbose(JSON.stringify(response));

  return response;
};
