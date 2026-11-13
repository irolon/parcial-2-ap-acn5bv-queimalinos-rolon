import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;

/** Genera el hash de una contraseña en texto plano. */
export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compara una contraseña en texto plano contra su hash. */
export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/*
 * Clave temporal del blanqueo (GX1). El PT la dicta o la pasa por WhatsApp:
 * el alfabeto deja afuera los caracteres que se confunden (0 O 1 l I).
 */
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
export const TEMP_PASSWORD_ALPHABET = UPPER + LOWER + DIGITS;
const TEMP_PASSWORD_LENGTH = 10;

const pick = (chars) => chars[crypto.randomInt(chars.length)];

/**
 * 10 caracteres al azar (crypto.randomInt) con al menos una mayúscula y un
 * número, para que cumpla las mismas reglas que una clave elegida. Se fuerzan
 * en dos posiciones distintas al azar en vez de regenerar hasta que salgan.
 */
export function generateTemporaryPassword() {
  const chars = Array.from({ length: TEMP_PASSWORD_LENGTH }, () => pick(TEMP_PASSWORD_ALPHABET));
  const upperAt = crypto.randomInt(TEMP_PASSWORD_LENGTH);
  let digitAt = crypto.randomInt(TEMP_PASSWORD_LENGTH - 1);
  if (digitAt >= upperAt) digitAt += 1;
  chars[upperAt] = pick(UPPER);
  chars[digitAt] = pick(DIGITS);
  return chars.join('');
}
