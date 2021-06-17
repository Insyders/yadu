const fs = require('fs');
const path = require('path');
const colors = require('colors');

colors.setTheme({
  debug: 'grey',
  verbose: 'magenta',
});

const logDebug = (message) =>
  process.env.DEBUG === '1' || process.env.DEBUG === 'true'
    ? console.debug(`${message && typeof message === 'object' ? JSON.stringify(message, null, 2) : message}`.debug)
    : null;
const logVerbose = (message) =>
  process.env.VERBOSE === '1' || process.env.VERBOSE === 'true'
    ? console.debug(`${message && typeof message === 'object' ? JSON.stringify(message, null, 2) : message}`.verbose)
    : null;

const isHome = (baseDir, iter = 0) => {
  logDebug(`[isHome] #${iter}`);
  if (iter >= (process.env.MAX_ITER || 8)) {
    throw new Error(`Reached the ${process.env.MAX_ITER || 8} iterations, at ${baseDir}`);
  }
  const exists = fs.existsSync(path.join(baseDir, '.git'));

  if (exists) {
    return { path: path.join(baseDir) + path.sep, success: true, iter };
  }

  iter += 1;
  return isHome(path.join(baseDir, '..'), iter);
};

module.exports = {
  logDebug,
  logVerbose,
  isHome,
};
