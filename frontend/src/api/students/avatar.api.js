import { request } from '@/api/shared/client';

const avatarPath = (studentId) => `/students/${encodeURIComponent(studentId)}/avatar`;

/** PUT /students/:id/avatar (multipart, campo `image`) → la URL firmada de la foto nueva. */
export async function uploadAvatar(studentId, file) {
  const body = new FormData();
  body.append('image', file);
  const res = await request(avatarPath(studentId), { method: 'PUT', body });
  return res.data.avatar_url;
}

/** DELETE /students/:id/avatar → 204 (idempotente). */
export function removeAvatar(studentId) {
  return request(avatarPath(studentId), { method: 'DELETE' });
}
