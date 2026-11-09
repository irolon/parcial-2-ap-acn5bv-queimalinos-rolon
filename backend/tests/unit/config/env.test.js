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
      TRUST_PROXY: '1',
      CRON_ENABLED: 'false',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'k',
      JWT_SECRET: 'test-secret-key-with-at-least-32-characters!!',
    });
    expect(env.CRON_ENABLED).toBe(false);
  });
});

const PROD = {
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  JWT_SECRET: 'test-secret-key-with-at-least-32-characters!!',
};

describe('env.RATE_LIMITS y TRUST_PROXY', () => {
  it('fuera de test: 10 logins por IP+email, 50 por IP, 30 auth y 30 públicos cada 15 min', async () => {
    const env = await loadEnv({ NODE_ENV: 'development', ...PROD, TRUST_PROXY: undefined });
    expect(env.RATE_LIMITS).toEqual({
      windowMs: 900000,
      login: 10,
      loginIp: 50,
      auth: 30,
      public: 30,
    });
    expect(env.TRUST_PROXY).toBeUndefined();
  });

  it('en test los límites por defecto son 100 veces mayores', async () => {
    const env = await loadEnv({
      NODE_ENV: 'test',
      RATE_LIMIT_LOGIN_MAX: undefined,
      RATE_LIMIT_LOGIN_IP_MAX: undefined,
    });
    expect(env.RATE_LIMITS).toMatchObject({ login: 1000, loginIp: 5000, auth: 3000, public: 3000 });
  });

  it('las variables de entorno pisan los valores por defecto', async () => {
    const env = await loadEnv({
      NODE_ENV: 'production',
      ...PROD,
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_LOGIN_MAX: '5',
      RATE_LIMIT_LOGIN_IP_MAX: '6',
      RATE_LIMIT_AUTH_MAX: '7',
      RATE_LIMIT_PUBLIC_MAX: '9',
      TRUST_PROXY: '1',
    });
    expect(env.RATE_LIMITS).toEqual({ windowMs: 60000, login: 5, loginIp: 6, auth: 7, public: 9 });
    expect(env.TRUST_PROXY).toBe(1);
  });

  it('un límite inválido corta el arranque', async () => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    await loadEnv({ NODE_ENV: 'production', ...PROD, TRUST_PROXY: '1', RATE_LIMIT_LOGIN_MAX: 'diez' });
    expect(exit).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('RATE_LIMIT_LOGIN_MAX'));
    exit.mockRestore();
    log.mockRestore();
  });
});

describe('TRUST_PROXY en producción', () => {
  const run = async (vars) => {
    const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const env = await loadEnv({ NODE_ENV: 'production', ...PROD, ...vars });
    const result = { env, exit: exit.mock.calls, log: log.mock.calls.flat().join(' ') };
    exit.mockRestore();
    log.mockRestore();
    return result;
  };

  it('sin definir corta el arranque', async () => {
    const { exit, log } = await run({ TRUST_PROXY: undefined });
    expect(exit).toEqual([[1]]);
    expect(log).toContain('TRUST_PROXY');
  });

  it('vacía cuenta como sin definir', async () => {
    const { exit } = await run({ TRUST_PROXY: '  ' });
    expect(exit).toEqual([[1]]);
  });

  it('"0" explícito (sin proxy) es válido', async () => {
    const { env, exit } = await run({ TRUST_PROXY: '0' });
    expect(exit).toEqual([]);
    expect(env.TRUST_PROXY).toBe(0);
  });

  it('fuera de producción no es obligatoria', async () => {
    const { exit } = await run({ NODE_ENV: 'development', TRUST_PROXY: undefined });
    expect(exit).toEqual([]);
  });
});
