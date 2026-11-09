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

/**
 * Con quién habla el que pide en la conversación de `studentId`: `{ id, name, avatar_url }` (para el alumno, su
 * entrenador/a, sin email). Sale de GET /messages/:studentId?limit=1, el único endpoint que hoy lo da; es un GET,
 * así que no marca nada como leído. `null` si el backend no lo manda.
 */
export async function getCounterpart(studentId) {
  const res = await request(`${base(studentId)}?limit=1`);
  return res.counterpart ?? null;
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
