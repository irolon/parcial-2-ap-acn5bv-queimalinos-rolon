export default {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/integration/'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/**/*.routes.js'],
  clearMocks: true,
  verbose: true,
};
