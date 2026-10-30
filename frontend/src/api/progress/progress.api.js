import { request } from '@/api/shared/client';

/** `?clave=valor` sin las claves vacías (null, undefined o ''). */
function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** GET /progress/overview → { exercises, weekly_volume }. */
export async function getOverview(studentId, { from, to } = {}) {
  const res = await request(`/progress/overview${query({ student_id: studentId, from, to })}`);
  return res.data;
}

/** GET /progress/exercise/:id → { exercise, points, pr, default_metric }. */
export async function getExerciseProgress(exerciseId, studentId, { from, to } = {}) {
  const res = await request(
    `/progress/exercise/${encodeURIComponent(exerciseId)}${query({ student_id: studentId, from, to })}`,
  );
  return res.data;
}

/** GET /progress/body/:studentId → { points, summary }. */
export async function getBodyProgress(studentId) {
  const res = await request(`/progress/body/${encodeURIComponent(studentId)}`);
  return res.data;
}
