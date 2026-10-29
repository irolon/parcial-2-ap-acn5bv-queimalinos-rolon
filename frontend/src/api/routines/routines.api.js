import { request } from '@/api/shared/client';

/** GET /routines → rutinas del entrenador. */
export async function listRoutines() {
  const res = await request('/routines');
  return res.data;
}

/** POST /routines → rutina creada (201). */
export async function createRoutine(body) {
  const res = await request('/routines', { method: 'POST', body });
  return res.data;
}
