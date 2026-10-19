import { request } from '@/api/shared/client';

/** POST /students (público) → `{ student, token, refresh_token }` (201). */
export function joinFromInvitation({ token, password }) {
  return request('/students', {
    method: 'POST',
    body: { token, password },
    auth: false,
    refresh: false,
  });
}
