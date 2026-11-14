import { request } from '@/api/shared/client';

/** GET /auth/me (trainer) → `{ id, name, email, specialty, professional_title, avatar_url, … }`. */
export async function getMe() {
  const res = await request('/auth/me');
  return res.data;
}

/** PATCH /auth/me (trainer) con `{ name?, professional_title? }` → el perfil actualizado. */
export async function updateMe(body) {
  const res = await request('/auth/me', { method: 'PATCH', body });
  return res.data;
}

/** PUT /auth/me/avatar (trainer, multipart, campo `image`) → la URL firmada de la foto nueva. */
export async function uploadAvatar(file) {
  const body = new FormData();
  body.append('image', file);
  const res = await request('/auth/me/avatar', { method: 'PUT', body });
  return res.data.avatar_url;
}

/** DELETE /auth/me/avatar → 204 (idempotente). */
export function removeAvatar() {
  return request('/auth/me/avatar', { method: 'DELETE' });
}
