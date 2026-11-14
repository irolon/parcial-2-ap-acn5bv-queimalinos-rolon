/**
 * Modelo de dominio: preferencias de push del alumno (GX3).
 * Una fila por alumno con una columna booleana por tipo; sin fila = todo prendido.
 * La preferencia decide si el alumno *quiere* el push; `push-policy.js`, si *puede* recibirlo.
 */

export const PREFERENCES_TABLE = 'notification_preferences';

/** Tipos que el alumno puede apagar, en el orden de la pantalla. */
export const PREFERENCE_TYPES = ['message', 'comment', 'appointment', 'pr', 'achievement'];

export const PREFERENCE_COLUMNS = 'message, comment, appointment, pr, achievement, updated_at';

export const DEFAULT_PREFERENCES = Object.freeze(
  Object.fromEntries(PREFERENCE_TYPES.map((type) => [type, true]))
);

/** Fila (o null si el alumno nunca guardó) → `{ message, comment, appointment, pr, achievement, updated_at }`. */
export function toPreferences(row) {
  if (!row) return { ...DEFAULT_PREFERENCES, updated_at: null };
  const out = Object.fromEntries(PREFERENCE_TYPES.map((type) => [type, row[type]]));
  return { ...out, updated_at: row.updated_at };
}

/** ¿Sale el push de este tipo? Un tipo que no está en la lista no se puede apagar. */
export function allowsPush(prefs, type) {
  if (!PREFERENCE_TYPES.includes(type)) return true;
  return prefs[type] !== false;
}
