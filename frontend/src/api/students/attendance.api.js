import { request } from '@/api/shared/client';

/** GET /students/:id/attendance?month=YYYY-MM → `{ month, sessions, assigned_days, has_plan, prs, days }`. */
export async function getAttendance(id, month) {
  const res = await request(`/students/${encodeURIComponent(id)}/attendance?month=${encodeURIComponent(month)}`);
  return res.data;
}
