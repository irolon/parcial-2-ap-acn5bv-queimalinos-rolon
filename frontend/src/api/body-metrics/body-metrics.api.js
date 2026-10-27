import { request } from '@/api/shared/client';

const base = (studentId) => `/students/${encodeURIComponent(studentId)}/metrics`;

/** GET /students/:id/metrics → historial ascendente por `recorded_at`. */
export async function listMetrics(studentId) {
  const res = await request(base(studentId));
  return res.data;
}

/** POST /students/:id/metrics → medida creada (201). */
export async function createMetric(studentId, body) {
  const res = await request(base(studentId), { method: 'POST', body });
  return res.data;
}

/** DELETE /students/:id/metrics/:metricId → 204. */
export async function deleteMetric(studentId, metricId) {
  await request(`${base(studentId)}/${encodeURIComponent(metricId)}`, { method: 'DELETE' });
}
