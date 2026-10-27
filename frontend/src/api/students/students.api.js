import { request } from '@/api/shared/client';

/** POST /students (público) → `{ student, token, refresh_token }` (201). */
export function joinFromInvitation({ token, password }) {
  return request('/students', {
    method: 'POST',
    body: { token, password },
    auth: false,
    refresh: false,
  });
}

const LIST_LIMIT = 100;

function listPage(active, page) {
  const params = new URLSearchParams();
  if (active !== undefined) params.set('active', String(active));
  params.set('limit', String(LIST_LIMIT));
  params.set('page', String(page));
  return request(`/students?${params}`);
}

/** GET /students → `Student[]` con todas las páginas (`active` filtra altas/bajas). */
export async function listStudents({ active } = {}) {
  const first = await listPage(active, 1);
  const totalPages = first.meta?.total_pages ?? 1;
  const rest = [];
  for (let page = 2; page <= totalPages; page += 1) rest.push(listPage(active, page));
  const pages = await Promise.all(rest);
  return [first, ...pages].flatMap((res) => res.data);
}

/** GET /students/:id → ficha con `last_session_at`, `latest_metrics` y `active_routine`. */
export async function getStudent(id) {
  const res = await request(`/students/${encodeURIComponent(id)}`);
  return res.data;
}

/** PATCH /students/:id → ficha actualizada. */
export async function updateStudent(id, body) {
  const res = await request(`/students/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  return res.data;
}
