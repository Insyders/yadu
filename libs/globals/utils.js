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
  logDebug(baseDir);

  if (!baseDir) {
    throw new Error('[isHome] Missing baseDir');
  }

  if (iter >= (process.env.MAX_ITER || 8)) {
    throw new Error(`Reached the ${process.env.MAX_ITER || 8} iterations, at ${baseDir}`);
  }
  const exists = fs.existsSync(path.join(baseDir, '.git'));

  if (exists) {
    logVerbose(`Home Path: ${path.join(baseDir)}${path.sep}`);
    return { path: path.join(baseDir) + path.sep, success: true, iter };
  }

  iter += 1;
  return isHome(path.join(baseDir, '..'), iter);
};

/**
 * It returns the first character in Upper case
 * @param {String} t The string to update
 */
function FirstLetterUpper(t) {
  return t[0].toUpperCase() + t.substring(1);
}

/**
 *
 * @param {String} s
 */
function Normalize(s) {
  return s.replace(/_/g, '').replace(/-/g, '');
}

module.exports = {
  logDebug,
  logVerbose,
  isHome,
  FirstLetterUpper,
  Normalize,
};
