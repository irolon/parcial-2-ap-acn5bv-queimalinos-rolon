/**
 * Guard de la suite de integración: corta antes de crear nada si el entorno
 * no apunta a un Supabase real (por ejemplo, si falta el .env y quedan los
 * valores dummy de test: localhost:54321 y test-service-role-key).
 */
export const QA_EMAIL_DOMAIN = 'test.fittrainer.dev';
export const QA_EMAIL_LIKE = `it.%@${QA_EMAIL_DOMAIN}`;

const LOCAL_URLS = ['localhost:54321', '127.0.0.1:54321'];
const DUMMY_KEY = 'test-service-role-key';
const HINT = 'copiá backend/.env con las credenciales de Supabase dev';

function stop(reason) {
  throw new Error(`Integración frenada: ${reason} (${HINT}).`);
}

/** Lanza si SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan o son los de test. */
export function assertRealSupabase(env) {
  const url = (env.SUPABASE_URL ?? '').trim();
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!url) stop('falta SUPABASE_URL');
  if (LOCAL_URLS.some((local) => url.includes(local))) {
    stop(`SUPABASE_URL apunta a un Supabase local (${url})`);
  }
  if (!key) stop('falta SUPABASE_SERVICE_ROLE_KEY');
  if (key === DUMMY_KEY) stop('SUPABASE_SERVICE_ROLE_KEY es la key dummy de test');
}
