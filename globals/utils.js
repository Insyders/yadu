const logDebug = (message) => (process.env.DEBUG ? console.debug(message) : null);
const logVerbose = (message) => (process.env.VERBOSE ? console.debug(message) : null);

module.exports = {
  logDebug,
  logVerbose,
};
