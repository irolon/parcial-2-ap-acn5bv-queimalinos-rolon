import * as notificationsRepo from '../../repositories/notifications/notifications.repository.js';
import * as pushTokensRepo from '../../repositories/notifications/push-tokens.repository.js';
import { isFcmEnabled, sendToToken } from './fcm.client.js';

/** Envía a todos los dispositivos; borra los tokens muertos. Devuelve true si alguno salió. */
async function pushToUser(userId, payload) {
  const tokens = await pushTokensRepo.findTokensForUser(userId);
  const results = await Promise.all(tokens.map((t) => sendToToken(t, payload)));
  const dead = tokens.filter((_, i) => ['unregistered', 'invalid'].includes(results[i].reason));
  await pushTokensRepo.deleteTokens(dead);
  return results.some((r) => r.ok);
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
  try {
    if (await pushToUser(userId, { title, body, data })) {
      notification = await notificationsRepo.setPushSent(notification.id, new Date().toISOString());
    }
  } catch (err) {
    console.error('[notifications] push', err.message);
  }
  return notification;
}
