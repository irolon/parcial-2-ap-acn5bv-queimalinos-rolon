import dotenv from 'dotenv';

dotenv.config();

/**
 * Carga y valida las variables de entorno (validación manual, sin librerías).
 * Si falta una requerida o el JWT_SECRET es corto, la app no arranca (fail-fast)
 * con un mensaje claro en vez de fallar misteriosamente en runtime.
 *
 * En entorno de test se usan valores dummy para no exigir un .env real.
 */
const isTest = process.env.NODE_ENV === 'test';

const defaults = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Jobs programados: activos por defecto, salvo en test o con CRON_ENABLED=false.
  CRON_ENABLED: !isTest && (process.env.CRON_ENABLED ?? 'true').trim().toLowerCase() !== 'false',
};

const required = isTest
  ? {
      SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
      JWT_SECRET: process.env.JWT_SECRET || 'test-secret-key-with-at-least-32-characters!!',
    }
  : {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      JWT_SECRET: process.env.JWT_SECRET,
    };

const errors = [];
for (const [key, value] of Object.entries(required)) {
  if (!value || value.trim() === '') errors.push(`Falta la variable de entorno ${key}`);
}
if (required.JWT_SECRET && required.JWT_SECRET.length < 32) {
  errors.push('JWT_SECRET debe tener al menos 32 caracteres');
}

// Rate limiting (en memoria, una sola instancia). En test los límites por defecto son 100 veces
// mayores, así la suite de integración (muchos registros desde la misma IP) no los toca.
const limitScale = isTest ? 100 : 1;
// Cada variable se parsea una vez directo a la forma que usa la app ({ windowMs, login, ... }).
const RATE_LIMIT_VARS = [
  ['windowMs', 'RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000],
  ['login', 'RATE_LIMIT_LOGIN_MAX', 10 * limitScale], // por IP + email
  ['loginIp', 'RATE_LIMIT_LOGIN_IP_MAX', 50 * limitScale], // por IP (password spraying)
  ['auth', 'RATE_LIMIT_AUTH_MAX', 30 * limitScale],
  ['public', 'RATE_LIMIT_PUBLIC_MAX', 30 * limitScale],
];
const rateLimits = {};
for (const [field, key, fallback] of RATE_LIMIT_VARS) {
  const raw = process.env[key];
  const value = raw === undefined || raw.trim() === '' ? fallback : Number(raw);
  if (!Number.isInteger(value) || value <= 0) errors.push(`${key} debe ser un entero positivo`);
  rateLimits[field] = value;
}

// trust proxy: cantidad de saltos de proxy (en el VPS detrás de nginx, 1). Sin definir, apagado.
// En producción es obligatoria: sin ella, detrás de nginx todos los clientes comparten la IP del
// proxy y el rate limiting los cuenta juntos. "0" explícito = sin proxy.
const rawTrustProxy = process.env.TRUST_PROXY?.trim();
const trustProxy = rawTrustProxy ? Number(rawTrustProxy) : undefined;
if (trustProxy !== undefined && (!Number.isInteger(trustProxy) || trustProxy < 0)) {
  errors.push('TRUST_PROXY debe ser un entero mayor o igual a 0 (cantidad de saltos de proxy)');
}
if (trustProxy === undefined && defaults.NODE_ENV === 'production') {
  errors.push('Falta la variable de entorno TRUST_PROXY (obligatoria en producción; 0 si no hay proxy)');
}

const port = Number.parseInt(defaults.PORT, 10);
if (Number.isNaN(port) || port <= 0) errors.push('PORT debe ser un número positivo');

if (errors.length > 0) {
  console.error('❌ Variables de entorno inválidas:');
  errors.forEach((e) => console.error(`   - ${e}`));
  process.exit(1);
}

export const env = {
  NODE_ENV: defaults.NODE_ENV,
  PORT: port,
  SUPABASE_URL: required.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: required.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  JWT_SECRET: required.JWT_SECRET,
  JWT_EXPIRES_IN: defaults.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: defaults.JWT_REFRESH_EXPIRES_IN,
  FRONTEND_URL: defaults.FRONTEND_URL,
  CRON_ENABLED: defaults.CRON_ENABLED,
  TRUST_PROXY: trustProxy,
  RATE_LIMITS: rateLimits,
  // Push (FCM HTTP v1): opcionales; sin credenciales el push es no-op. En test se ignoran.
  FCM_SERVICE_ACCOUNT_PATH: isTest ? undefined : process.env.FCM_SERVICE_ACCOUNT_PATH,
  FCM_SERVICE_ACCOUNT_JSON: isTest ? undefined : process.env.FCM_SERVICE_ACCOUNT_JSON,
};
