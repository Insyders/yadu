// Require the config script, it uses the ENV=yadu-config to know which secrets to load
// ENV=config-old node __tests__/POC/use-env-v2.spec.js
const { loadEnv } = require('../config');

function useEnv() {
  console.log('[USE-ENV-V2]');
  console.log(`Use Env : ${process.env.DB_NAME}`);
}

(async () => {
  await loadEnv();
  useEnv();
})();
