// Suite de integración (npm run test:integration): Supertest sobre createApp() contra Supabase dev.
// La lanza el script con NODE_ENV=test, TZ=UTC y --runInBand. `npm test` no la levanta.
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.int.test.js'],
  testTimeout: 30000,
  globalSetup: '<rootDir>/tests/helpers/integration/global-setup.js',
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/integration/after-env.js'],
  verbose: true,
};
