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

/** PATCH /sessions/:id/comment → resumen actualizado. `''` o `null` borran el comentario. */
export async function commentSession(sessionId, trainerComment) {
  const res = await request(`/sessions/${encodeURIComponent(sessionId)}/comment`, {
    method: 'PATCH',
    body: { trainer_comment: trainerComment },
  });
  return res.data;
}
