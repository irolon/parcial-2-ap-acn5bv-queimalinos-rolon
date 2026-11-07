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

describe('env de n8n (asistente IA del entrenador)', () => {
  const BASE = {
    NODE_ENV: 'production',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
    JWT_SECRET: 'test-secret-key-with-at-least-32-characters!!',
  };

  it('arranca sin las variables de n8n (son opcionales)', async () => {
    const env = await loadEnv({ ...BASE, N8N_TRAINER_AI_WEBHOOK_URL: undefined, N8N_WEBHOOK_SECRET: undefined });
    expect(env.N8N_TRAINER_AI_WEBHOOK_URL).toBeUndefined();
    expect(env.N8N_WEBHOOK_SECRET).toBeUndefined();
  });

  it('las lee recortadas; vacías quedan undefined', async () => {
    const env = await loadEnv({ ...BASE, N8N_TRAINER_AI_WEBHOOK_URL: ' http://n8n:5678/webhook/trainer-ia ', N8N_WEBHOOK_SECRET: '  ' });
    expect(env.N8N_TRAINER_AI_WEBHOOK_URL).toBe('http://n8n:5678/webhook/trainer-ia');
    expect(env.N8N_WEBHOOK_SECRET).toBeUndefined();
  });
});

describe('env de n8n (chat IA del alumno)', () => {
  const BASE = {
    NODE_ENV: 'production',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
    JWT_SECRET: 'test-secret-key-with-at-least-32-characters!!',
  };

  it('N8N_STUDENT_AI_WEBHOOK_URL es opcional y se lee recortada', async () => {
    expect((await loadEnv({ ...BASE, N8N_STUDENT_AI_WEBHOOK_URL: undefined })).N8N_STUDENT_AI_WEBHOOK_URL).toBeUndefined();
    const env = await loadEnv({ ...BASE, N8N_STUDENT_AI_WEBHOOK_URL: ' http://n8n:5678/webhook/student-ia ' });
    expect(env.N8N_STUDENT_AI_WEBHOOK_URL).toBe('http://n8n:5678/webhook/student-ia');
  });
});
