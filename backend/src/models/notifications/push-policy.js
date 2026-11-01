/**
 * Política de push por tipo y rol: qué notificaciones además de guardarse
 * se avisan al celular. Función pura.
 */

/** Tipo → rol → ¿push? Lo que no figura no se envía. */
export const PUSH_POLICY = {
  inactivity: { trainer: true },
  routine_modified: { trainer: true },
  pr: { student: true },
  achievement: { student: true },
  comment: { student: true },
  appointment: { student: true },
};

/**
 * @param {string} type tipo de notificación
 * @param {'trainer'|'student'} role destinatario
 * @param {{ fromJob?: boolean }} [opts] los logros que desbloquea el job nocturno no hacen push
 */
export function shouldPush(type, role, { fromJob = false } = {}) {
  if (type === 'achievement' && fromJob) return false;
  return PUSH_POLICY[type]?.[role] === true;
}
