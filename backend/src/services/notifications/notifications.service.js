import * as readRepo from '../../repositories/notifications/notifications-read.repository.js';
import * as pushTokensRepo from '../../repositories/notifications/push-tokens.repository.js';
import { Errors } from '../../shared/utils/errors.js';

/** Página de notificaciones propias + total de no leídas y cursor para la siguiente página. */
export async function list(user, { unread_only: unreadOnly, limit, before }) {
  const [rows, unreadCount] = await Promise.all([
    readRepo.findPage(user, { unreadOnly, limit, before }),
    readRepo.countUnread(user),
  ]);
  const full = rows.length === limit;
  return {
    data: rows,
    meta: { unread_count: unreadCount, next_before: full ? rows[rows.length - 1].created_at : null },
  };
}

export async function markRead(user, id) {
  if ((await readRepo.markRead(user, id)) === 0) throw Errors.notificationNotFound();
}

export const markAllRead = (user) => readRepo.markAllRead(user);

/** Upsert por token; `created` indica si era nuevo (201) o ya existía (200). */
export async function registerToken(user, { token, platform }) {
  const existed = await pushTokensRepo.tokenExists(token);
  await pushTokensRepo.upsertToken(user, token, platform, new Date().toISOString());
  return { created: !existed, data: { token, platform } };
}

export const removeToken = (user, token) => pushTokensRepo.deleteTokenForUser(user, token);
