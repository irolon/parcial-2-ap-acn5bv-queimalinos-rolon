import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';

/** Cuerpo del 429, con el formato de error del contrato. */
const LIMITED_BODY = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Demasiados intentos. Probá de nuevo en unos minutos.',
    details: [],
  },
};

/** Largo máximo de un email (RFC 5321): la clave del login nunca guarda más que eso. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Limitador en memoria (el VPS corre una sola instancia). Responde 429 con el formato del
 * contrato; `standardHeaders` manda RateLimit-* y, al pasarse, Retry-After en segundos.
 */
export function createRateLimiter({ limit, windowMs, keyGenerator = ipKey }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, res, _next, options) => res.status(options.statusCode).json(LIMITED_BODY),
  });
}

/** Clave por IP. Las IPv6 se agrupan por subred /56 (un cliente suele tener toda la subred). */
function ipKey(req) {
  return ipKeyGenerator(req.ip);
}

/**
 * Clave del login: IP + email normalizado (otro email desde la misma IP tiene su propio cupo).
 * El email todavía no pasó la validación: se acota para que la clave no pese hasta 100 kB.
 */
export function loginKey(req) {
  const raw = typeof req.body?.email === 'string' ? req.body.email : '';
  return `${ipKey(req)}|${raw.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH)}`;
}

/**
 * Arma los limitadores de la app: uno (y un contador) por endpoint, así registrarse no gasta el
 * cupo del refresh. `limits` permite límites bajos en los tests; por defecto salen del env.
 */
export function createRateLimiters(limits = env.RATE_LIMITS) {
  const { windowMs } = limits;
  const byIp = (limit) => createRateLimiter({ limit, windowMs });
  return {
    // Login: primero el tope por IP sola (password spraying: muchos emails desde la misma IP), así
    // una IP bloqueada no crea claves nuevas; después IP + email (fuerza bruta a una cuenta).
    login: [byIp(limits.loginIp), createRateLimiter({ limit: limits.login, windowMs, keyGenerator: loginKey })],
    register: [byIp(limits.auth)],
    refresh: [byIp(limits.auth)],
    invitation: [byIp(limits.public)],
    studentSignup: [byIp(limits.public)],
    // GX1: van con usuario autenticado, pero el cambio prueba claves (fuerza bruta a la actual),
    // el blanqueo escribe y la exportación arma el CSV en memoria. Mismo cupo que auth.
    passwordChange: [byIp(limits.auth)],
    passwordReset: [byIp(limits.auth)],
    export: [byIp(limits.auth)],
  };
}

/**
 * Middleware para la cadena del endpoint (dentro de su router, así '//login' no lo esquiva).
 * Corre los limitadores `name` que createApp dejó en app.locals.rateLimiters, en orden; el
 * primero que responde 429 corta la cadena.
 */
export function limitRate(name) {
  const middleware = (req, res, next) => {
    const limiters = req.app.locals.rateLimiters?.[name];
    if (!limiters) return next(new Error(`Limitador "${name}" sin configurar en app.locals`));
    const run = (i) => (err) => {
      if (err) return next(err);
      if (i === limiters.length) return next();
      return limiters[i](req, res, run(i + 1));
    };
    return run(0)();
  };
  // Marca para el barrido de rutas (tests/unit/app): qué endpoint está limitado y con qué.
  middleware.rateLimit = name;
  return middleware;
}
