import { request } from '@/api/shared/client';

/** GET /students/overview → resumen del entrenador (KPIs, `recent`, `daily`…), solo de sus alumnos activos. */
export async function getOverview() {
  const res = await request('/students/overview');
  return res.data;
}
