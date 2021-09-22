function exportEnv() {
  // Custom logic to load the appropriate environment variables
  console.log(process.env.FOO);
  process.env.FOO = 'bar';
  console.log(process.env.FOO);
}

module.exports = { exportEnv };
