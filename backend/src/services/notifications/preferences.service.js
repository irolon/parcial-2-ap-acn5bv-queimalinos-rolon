import * as preferencesRepo from '../../repositories/notifications/preferences.repository.js';
import { PREFERENCE_TYPES, allowsPush, toPreferences } from '../../models/notifications/preferences.js';
import { Errors } from '../../shared/utils/errors.js';

/** Las preferencias son solo del alumno; el dueño es siempre `user.id` (no hay `:id`). */
function assertStudent(user) {
  if (user.role !== 'student') throw Errors.forbidden('Solo el alumno tiene preferencias de notificación');
}

/** GET /notifications/preferences: sin fila, todo prendido y `updated_at: null`. */
export async function get(user) {
  assertStudent(user);
  return toPreferences(await preferencesRepo.findByStudent(user.id));
}

/** PUT /notifications/preferences: reemplaza las cinco (cualquier otro campo del body se ignora). */
export async function replace(user, body) {
  assertStudent(user);
  const prefs = Object.fromEntries(PREFERENCE_TYPES.map((type) => [type, body[type]]));
  return toPreferences(await preferencesRepo.upsert(user.id, prefs, new Date().toISOString()));
}

/**
 * ¿El destinatario quiere el push de este tipo? El PT no tiene preferencias: siempre `true`, sin leer
 * (los ids pueden repetirse entre trainers y students). Si la lectura falla, lanza: lo atrapa `notify`.
 */
export async function isPushAllowed(userId, userRole, type) {
  if (userRole !== 'student') return true;
  return allowsPush(toPreferences(await preferencesRepo.findByStudent(userId)), type);
}
