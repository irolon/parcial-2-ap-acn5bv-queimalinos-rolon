import * as notificationsRepo from '../../repositories/notifications/notifications.repository.js';
import * as pushTokensRepo from '../../repositories/notifications/push-tokens.repository.js';
import { isFcmEnabled, sendToToken } from './fcm.client.js';

const DEAD_REASONS = ['unregistered', 'invalid'];

/** Envía a todos los dispositivos. Devuelve si alguno salió y los tokens que FCM dio por muertos. */
async function pushToUser(userId, payload) {
  const tokens = await pushTokensRepo.findTokensForUser(userId);
  const results = await Promise.all(tokens.map((t) => sendToToken(t, payload)));
  return {
    sent: results.some((r) => r.ok),
    dead: tokens.filter((_, i) => DEAD_REASONS.includes(results[i].reason)),
  };
}

/**
 * Guarda la notificación (fuente de verdad; si falla la BD, lanza) y, si corresponde,
 * intenta el push en best-effort: ningún error del push se propaga.
 */
export async function notify({ userId, userRole, type, title, body = null, data = {}, push = true }) {
  let notification = await notificationsRepo.insert({
    user_id: userId,
    user_role: userRole,
    type,
    title,
    body,
    data,
  });
  if (!push || !isFcmEnabled()) return notification;
  let dead = [];
  try {
    const result = await pushToUser(userId, { title, body, data });
    dead = result.dead;
    if (result.sent) {
      notification = await notificationsRepo.setPushSent(notification.id, new Date().toISOString());
    }
  } catch (err) {
    console.error('[notifications] push', err.message);
  }
  try {
    await pushTokensRepo.deleteTokens(dead);
  } catch (err) {
    console.error('[notifications] limpieza de tokens', err.message);
  }
  return notification;
}

/** Push sin fila (p. ej. el resumen de varios logros, que ya tienen su fila). Best-effort, nunca lanza. */
export async function pushOnly({ userId, title, body = null, data = {} }) {
  if (!isFcmEnabled()) return;
  try {
    const { dead } = await pushToUser(userId, { title, body, data });
    await pushTokensRepo.deleteTokens(dead);
  } catch (err) {
    console.error('[notifications] push', err.message);
  }
}
