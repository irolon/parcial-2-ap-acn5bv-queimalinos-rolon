import { request } from '@/api/shared/client';
import { pickPreferences } from '@/utils/notifications/preferences';

/** GET /notifications/preferences (alumno) → `{ message, comment, appointment, pr, achievement, updated_at }`. */
export async function getPreferences() {
  const res = await request('/notifications/preferences');
  return res.data;
}

/** PUT /notifications/preferences con los cinco booleanos → las preferencias guardadas (igual que el GET). */
export async function savePreferences(prefs) {
  const res = await request('/notifications/preferences', { method: 'PUT', body: pickPreferences(prefs) });
  return res.data;
}
