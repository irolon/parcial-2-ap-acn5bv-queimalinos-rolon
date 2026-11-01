import { request } from '@/api/shared/client';

const base = (studentId) => `/messages/${encodeURIComponent(studentId)}`;

/** GET /messages/conversations (PT) → `[{ student, last_message, unread_count }]`. */
export async function getConversations() {
  const res = await request('/messages/conversations');
  return res.data;
}

/** GET /messages/unread-count → número de mensajes sin leer. */
export async function getUnreadCount() {
  const res = await request('/messages/unread-count');
  return res.data.count;
}

/**
 * GET /messages/:studentId → `{ data, meta: { next_before }, counterpart }`, con `data` en orden cronológico.
 * `before` es el `next_before` de la página anterior: se manda tal cual (string) y se codifica por el `+` de la zona.
 */
export function getMessages(studentId, { before } = {}) {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  return request(`${base(studentId)}${query}`);
}

/** POST /messages/:studentId (multipart) → mensaje creado. Hace falta `body` o `file`. */
export async function sendMessage(studentId, { body, file } = {}) {
  const form = new FormData();
  if (body) form.append('body', body);
  if (file) form.append('image', file);
  const res = await request(base(studentId), { method: 'POST', body: form });
  return res.data;
}

/** POST /messages/:studentId/read → `{ updated }`. */
export async function markRead(studentId) {
  const res = await request(`${base(studentId)}/read`, { method: 'POST' });
  return res.data;
}

/** POST /messages/broadcast (PT, solo texto) → `{ broadcast_id, sent }`. */
export async function broadcast({ studentIds, body }) {
  const res = await request('/messages/broadcast', { method: 'POST', body: { student_ids: studentIds, body } });
  return res.data;
}
