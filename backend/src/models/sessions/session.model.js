/**
 * Modelo de dominio: Session (sesión de entrenamiento) y sus series.
 * Estructura + helpers puros. SIN lógica de negocio ni acceso a datos.
 */

export const SESSIONS_TABLE = 'sessions';
export const SESSION_SETS_TABLE = 'session_sets';

export const SESSION_COLUMNS =
  'id, student_id, routine_id, started_at, finished_at, rpe, notes, has_modifications';

/** Una serie es sustitución si el alumno hizo otro ejercicio que el planificado. */
export function isSubstitution(set) {
  const original = set.original_exercise_id;
  return original !== null && original !== undefined && original !== set.exercise_id;
}

/** Una sesión sin finished_at que empezó hace más de esto se da por abandonada: no se muestra ni se borra. */
export const OPEN_SESSION_MAX_HOURS = 4;

/** Desde cuándo (ISO) una sesión sin finished_at cuenta como abierta: now − OPEN_SESSION_MAX_HOURS. */
export const openSince = (now = new Date()) =>
  new Date(now.getTime() - OPEN_SESSION_MAX_HOURS * 3_600_000).toISOString();
