import { request } from '@/api/shared/client';

/** GET /routine-templates → resumen (`days`, `exercise_count`). */
export async function listTemplates() {
  const res = await request('/routine-templates');
  return res.data;
}

/** GET /routine-templates/:id → plantilla con `structure.exercises[i].exercise`. */
export async function getTemplate(id) {
  const res = await request(`/routine-templates/${encodeURIComponent(id)}`);
  return res.data;
}

/** POST /routine-templates → plantilla creada (201). */
export async function createTemplate(body) {
  const res = await request('/routine-templates', { method: 'POST', body });
  return res.data;
}
