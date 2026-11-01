import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { TRAINERS_TABLE, TRAINER_PUBLIC_COLUMNS } from '../../models/auth/trainer.model.js';
import { REFRESH_TOKENS_TABLE } from '../../models/auth/refresh-token.model.js';

/** Busca un trainer por email, incluyendo el password_hash (para login). */
export async function findTrainerByEmailWithHash(email) {
  const { data, error } = await supabase
    .from(TRAINERS_TABLE)
    .select(`${TRAINER_PUBLIC_COLUMNS}, password_hash`)
    .eq('email', email)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Crea un trainer y devuelve sus campos públicos (sin el hash). */
export async function createTrainer({ name, email, passwordHash, specialty }) {
  const { data, error } = await supabase
    .from(TRAINERS_TABLE)
    .insert({ name, email, password_hash: passwordHash, specialty })
    .select(TRAINER_PUBLIC_COLUMNS)
    .single();
  // 23505 = unique_violation en PostgreSQL (email duplicado).
  if (error && error.code === '23505') throw Errors.emailExists();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Persiste el hash de un refresh token emitido. */
export async function saveRefreshToken({ userId, role, tokenHash, expiresAt }) {
  const { error } = await supabase.from(REFRESH_TOKENS_TABLE).insert({
    user_id: userId,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw Errors.internal(error.message);
}

/** Busca un refresh token vigente (no revocado) por su hash. */
export async function findRefreshToken(tokenHash) {
  const { data, error } = await supabase
    .from(REFRESH_TOKENS_TABLE)
    .select('id, user_id, role, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Marca un refresh token como revocado (logout / rotación). */
export async function revokeRefreshToken(tokenHash) {
  const { error } = await supabase
    .from(REFRESH_TOKENS_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);
  if (error) throw Errors.internal(error.message);
}

/**
 * Revoca todos los refresh tokens vigentes de un usuario (baja del alumno).
 * Ninguno de sus dispositivos puede renovar la sesión después de esto.
 */
export async function revokeAllForUser(userId, role) {
  const { error } = await supabase
    .from(REFRESH_TOKENS_TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('role', role)
    .is('revoked_at', null);
  if (error) throw Errors.internal(error.message);
}

/** Busca un trainer por id (campos públicos, sin el hash). null si no existe. */
export async function findTrainerById(id) {
  const { data, error } = await supabase
    .from(TRAINERS_TABLE)
    .select(TRAINER_PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}
