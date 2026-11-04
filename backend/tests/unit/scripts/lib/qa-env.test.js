import {
  assertRealSupabase,
  QA_EMAIL_DOMAIN,
  QA_EMAIL_LIKE,
} from '../../../../scripts/lib/qa-env.js';

const REAL_URL = 'https://abc.supabase.co';

describe('qa-env — constantes', () => {
  it('el dominio y el patrón de los emails de QA', () => {
    expect(QA_EMAIL_DOMAIN).toBe('test.fittrainer.dev');
    expect(QA_EMAIL_LIKE).toBe('it.%@test.fittrainer.dev');
  });
});

describe('qa-env — assertRealSupabase', () => {
  it.each([
    ['sin variables', {}],
    ['Supabase local', { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'x' }],
    [
      'Supabase local por IP',
      { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'x' },
    ],
    ['URL vacía', { SUPABASE_URL: '  ', SUPABASE_SERVICE_ROLE_KEY: 'x' }],
    ['key de test', { SUPABASE_URL: REAL_URL, SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key' }],
    ['key vacía', { SUPABASE_URL: REAL_URL, SUPABASE_SERVICE_ROLE_KEY: '' }],
    ['sin key', { SUPABASE_URL: REAL_URL }],
  ])('%s → frena y nombra la variable', (_name, env) => {
    expect(() => assertRealSupabase(env)).toThrow(/^Integración frenada:.*SUPABASE_/);
  });

  it('sin URL nombra SUPABASE_URL', () => {
    expect(() => assertRealSupabase({})).toThrow(/SUPABASE_URL/);
  });

  it('con key de test nombra SUPABASE_SERVICE_ROLE_KEY', () => {
    const env = { SUPABASE_URL: REAL_URL, SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key' };
    expect(() => assertRealSupabase(env)).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('URL real y key real → no lanza', () => {
    const env = { SUPABASE_URL: REAL_URL, SUPABASE_SERVICE_ROLE_KEY: 'eyJ.real.key' };
    expect(() => assertRealSupabase(env)).not.toThrow();
  });
});
