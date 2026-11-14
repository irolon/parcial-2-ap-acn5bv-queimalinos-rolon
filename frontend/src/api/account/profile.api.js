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
