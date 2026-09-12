export default {
  testEnvironment: 'node',
  transform: {},
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  maxWorkers: 1,
  testTimeout: 60000,
};
