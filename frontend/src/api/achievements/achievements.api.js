import { request } from '@/api/shared/client';

const student = (id, resource) => `/students/${encodeURIComponent(id)}/${resource}`;

/** GET /students/:id/streak → `{ current_streak_days, longest_streak_days, last_session_date }`. */
export async function getStudentStreak(id) {
  const res = await request(student(id, 'streak'));
  return res.data;
}
