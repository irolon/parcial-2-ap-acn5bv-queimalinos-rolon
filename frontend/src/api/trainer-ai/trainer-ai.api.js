import { request } from '@/api/shared/client';

/** POST /trainer-ai/generate-routine → `{ generation_id, routine_proposal }`. `signal` cancela el pedido. */
export async function generateRoutine(body, { signal } = {}) {
  const res = await request('/trainer-ai/generate-routine', { method: 'POST', body, signal });
  return res.data;
}

/** POST /trainer-ai/save-as-template → `{ generation_id, templates }` (201; una plantilla por bloque). */
export async function saveAsTemplates(body) {
  const res = await request('/trainer-ai/save-as-template', { method: 'POST', body });
  return res.data;
}
