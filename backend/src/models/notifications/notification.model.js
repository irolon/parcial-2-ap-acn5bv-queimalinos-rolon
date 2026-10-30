/**
 * Modelo de dominio: Notificaciones y tokens de push.
 * Tablas, columnas, enums y umbrales. SIN lógica de negocio ni acceso a datos.
 */

export const NOTIFICATIONS_TABLE = 'notifications';
export const PUSH_TOKENS_TABLE = 'push_tokens';

/** Mismos valores que el check de `notifications.type` en el schema. */
export const NOTIFICATION_TYPES = [
  'inactivity',
  'appointment',
  'comment',
  'pr',
  'achievement',
  'routine_modified',
];

/** Días asignados sin entrenar a partir de los cuales un alumno está inactivo. */
export const INACTIVITY_MISSED_DAYS = 3;
/** Ventana en días: máximo un aviso de inactividad por alumno. */
export const INACTIVITY_COOLDOWN_DAYS = 7;

export const PUSH_PLATFORMS = ['android', 'web'];

export const NOTIFICATION_COLUMNS =
  'id, user_id, user_role, type, title, body, data, read, push_sent_at, created_at';
export const PUSH_TOKEN_COLUMNS = 'id, user_id, user_role, token, platform, created_at, last_seen_at';
