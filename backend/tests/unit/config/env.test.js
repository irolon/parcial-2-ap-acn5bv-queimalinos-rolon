import { afterEach, describe, expect, it, jest } from '@jest/globals';

const ORIGINAL = { ...process.env };

async function loadEnv(vars) {
  jest.resetModules();
  process.env = { ...ORIGINAL, ...vars };
  return (await import('../../../src/config/env.js')).env;
}

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('env.CRON_ENABLED', () => {
  it('en test siempre está apagado, aunque se pida true', async () => {
    const env = await loadEnv({ NODE_ENV: 'test', CRON_ENABLED: 'true' });
    expect(env.CRON_ENABLED).toBe(false);
  });

  it('fuera de test está activo por defecto', async () => {
    const env = await loadEnv({
      NODE_ENV: 'development',
      CRON_ENABLED: undefined,
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      JWT_SECRET: 'test-secret-key-with-at-least-32-characters!!',
    });
    expect(env.CRON_ENABLED).toBe(true);
  });

  it('CRON_ENABLED=false lo apaga fuera de test', async () => {
    const env = await loadEnv({
      NODE_ENV: 'production',
      CRON_ENABLED: 'false',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      JWT_SECRET: 'test-secret-key-with-at-least-32-characters!!',
    });
    expect(env.CRON_ENABLED).toBe(false);
  });
});
