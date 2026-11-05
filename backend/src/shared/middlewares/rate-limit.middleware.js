import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';

/** Cuerpo del 429, con el formato de error del contrato. */
const LIMITED_BODY = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos. Probá de nuevo en unos minutos.',
    details: [],
  },
};

/**
 * Limitador en memoria (el VPS corre una sola instancia). Responde 429 con el formato del
 * contrato; `standardHeaders` manda RateLimit-* y, al pasarse, Retry-After en segundos.
 */
export function createRateLimiter({ limit, windowMs, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, res, _next, options) => res.status(options.statusCode).json(LIMITED_BODY),
  });
}

/** Clave del login: IP + email en minúsculas (otro email desde la misma IP tiene su propio cupo). */
const loginKey = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${req.ip}|${email}`;
};

/**
 * Monta los limitadores sobre las rutas sensibles. Va después de express.json() (el del login
 * lee el email del body) y antes de los routers. `limits` permite armar la app con límites
 * bajos en los tests; por defecto salen del env.
 */
export function applyRateLimits(app, limits = env.RATE_LIMITS) {
  const { windowMs } = limits;
  // Un limitador (y un contador) por endpoint: registrarse no gasta el cupo del refresh.
  const byIp = (limit) => createRateLimiter({ limit, windowMs });

  app.post('/api/auth/login', createRateLimiter({ limit: limits.login, windowMs, keyGenerator: loginKey }));
  app.post('/api/auth/register', byIp(limits.auth));
  app.post('/api/auth/refresh', byIp(limits.auth));
  app.get('/api/invitations/:token', byIp(limits.public));
  app.post('/api/students', byIp(limits.public));
}
