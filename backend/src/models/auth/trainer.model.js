/**
 * Modelo de dominio: Trainer.
 * Estructura de datos pura + mapeo de filas de la DB. SIN lógica de negocio
 * (eso vive en el service) y SIN acceso a datos (eso vive en el repository).
 */

/** Nombre de la tabla en la base de datos. */
export const TRAINERS_TABLE = 'trainers';

/** Columnas públicas del trainer (nunca incluye password_hash). */
export const TRAINER_PUBLIC_COLUMNS = 'id, name, email, specialty, avatar_url, created_at, password_changed_at';

/**
 * Mapea una fila cruda de la DB a la entidad pública Trainer,
 * descartando cualquier campo sensible (password_hash).
 */
export function toTrainer(row) {
  if (!row) return null;
  const { password_hash: _passwordHash, ...trainer } = row;
  return trainer;
}
