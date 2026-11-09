import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Claim que lleva el access token del alumno con la clave blanqueada (GX1):
 * authenticate lo rechaza con 403 salvo en PUT /auth/password. Viaja en el
 * token para no consultar la base en cada pedido.
 */
export const MUST_CHANGE_CLAIM = 'must_change_password';

/**
 * Firma un access token (JWT) de corta duración.
 * payload típico: { sub: <userId>, role: 'trainer' | 'student', email }
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

/** Verifica y decodifica un access token. Lanza si es inválido o expiró. */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Genera un refresh token opaco (no es un JWT).
 * Se devuelve el token en claro al cliente y se persiste solo su hash,
 * de modo que un leak de la DB no permita reconstruir tokens válidos.
 */
export function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

/** Hash determinístico (SHA-256) para almacenar/buscar refresh tokens. */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Convierte una duración tipo '30d' | '1h' | '15m' | '45s' a milisegundos. */
export function durationToMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(String(duration).trim());
  if (!match) throw new Error(`Duración inválida: ${duration}`);
  return Number(match[1]) * UNIT_MS[match[2]];
}

/** Fecha de expiración (ISO) del refresh token según JWT_REFRESH_EXPIRES_IN. */
export function refreshTokenExpiryISO() {
  return new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)).toISOString();
}
