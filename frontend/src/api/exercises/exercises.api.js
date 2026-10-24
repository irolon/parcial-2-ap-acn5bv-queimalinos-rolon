import { request } from '@/api/shared/client';

/** GET /exercises → `Exercise[]` (globales + propios del entrenador). */
export async function listExercises() {
  const res = await request('/exercises');
  return res.data;
}

/** POST /exercises → `Exercise` creado. */
export async function createExercise(body) {
  const res = await request('/exercises', { method: 'POST', body });
  return res.data;
}

/** PATCH /exercises/:id → `Exercise` actualizado. */
export async function updateExercise(id, body) {
  const res = await request(`/exercises/${encodeURIComponent(id)}`, { method: 'PATCH', body });
  return res.data;
}

/** DELETE /exercises/:id → 204 (409 si está en uso). */
export async function deleteExercise(id) {
  await request(`/exercises/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
