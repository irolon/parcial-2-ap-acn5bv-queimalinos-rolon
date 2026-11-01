import { request } from '@/api/shared/client';

const path = (id) => `/challenges/${encodeURIComponent(id)}`;

/** GET /challenges → desafíos del entrenador con `assignments_count` y `active_count`. */
export async function listChallenges() {
  const res = await request('/challenges');
  return res.data;
}

/** POST /challenges → desafío creado (201). */
export async function createChallenge(body) {
  const res = await request('/challenges', { method: 'POST', body });
  return res.data;
}

/** DELETE /challenges/:id (204). */
export async function deleteChallenge(id) {
  await request(path(id), { method: 'DELETE' });
}

/** POST /challenges/:id/assignments → `{ created, skipped }` (201). */
export async function assignChallenge(id, studentIds) {
  const res = await request(`${path(id)}/assignments`, { method: 'POST', body: { student_ids: studentIds } });
  return res.data;
}

/** GET /challenges/:id/active-students → ids de alumnos con el desafío en curso. */
export async function getActiveStudents(id) {
  const res = await request(`${path(id)}/active-students`);
  return res.data;
}
