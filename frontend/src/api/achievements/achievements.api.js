import { request } from '@/api/shared/client';

const student = (id, resource) => `/students/${encodeURIComponent(id)}/${resource}`;

/** GET /achievements → catálogo de logros. */
export async function listAchievements() {
  const res = await request('/achievements');
  return res.data;
}

/** GET /students/:id/achievements → logros desbloqueados. */
export async function getStudentAchievements(id) {
  const res = await request(student(id, 'achievements'));
  return res.data;
}

/** GET /students/:id/streak → `{ current_streak_days, longest_streak_days, last_session_date }`. */
export async function getStudentStreak(id) {
  const res = await request(student(id, 'streak'));
  return res.data;
}

/** GET /students/:id/challenges → desafíos del alumno con su progreso. */
export async function getStudentChallenges(id) {
  const res = await request(student(id, 'challenges'));
  return res.data;
}
