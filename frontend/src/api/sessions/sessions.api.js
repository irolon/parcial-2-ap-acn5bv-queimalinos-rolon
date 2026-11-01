import { request } from '@/api/shared/client';

const base = (studentId) => `/students/${encodeURIComponent(studentId)}/sessions`;

/** GET /students/:id/sessions?page=&limit= → `{ data, meta }`. */
export function listSessions(studentId, { page = 1, limit = 20 } = {}) {
  return request(`${base(studentId)}?page=${page}&limit=${limit}`);
}

/** GET /students/:id/sessions/:sessionId → resumen + ejercicios con series. */
export async function getSession(studentId, sessionId) {
  const res = await request(`${base(studentId)}/${encodeURIComponent(sessionId)}`);
  return res.data;
}

/**
 * POST /sessions → la sesión con `unlocked_achievements` (201 si es nueva, 200 si es un reintento: es idempotente por `id`).
 * Body: `{ id, routine_id, started_at, finished_at, rpe?, notes? }`. `signal` corta el pedido.
 */
export async function createSession(body, { signal } = {}) {
  const res = await request('/sessions', { method: 'POST', body, signal });
  return res.data;
}

/**
 * POST /sessions/:id/sets → `{ saved, failed, unlocked_achievements }` para un lote de hasta 100 series.
 * También es idempotente por `id` de cada serie; las `failed` son errores por serie, no del pedido.
 */
export async function uploadSets(sessionId, sets, { signal } = {}) {
  const res = await request(`/sessions/${encodeURIComponent(sessionId)}/sets`, { method: 'POST', body: { sets }, signal });
  return res.data;
}

/** PATCH /sessions/:id/comment → resumen actualizado. `''` o `null` borran el comentario. */
export async function commentSession(sessionId, trainerComment) {
  const res = await request(`/sessions/${encodeURIComponent(sessionId)}/comment`, {
    method: 'PATCH',
    body: { trainer_comment: trainerComment },
  });
  return res.data;
}
