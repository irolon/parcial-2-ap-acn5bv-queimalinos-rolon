import { request } from '@/api/shared/client';

/** POST /invitations (trainer) → `{ invitation_id, token, join_url, expires_at, qr_base64?, whatsapp_share_url? }`. */
export async function createInvitation(data) {
  const res = await request('/invitations', { method: 'POST', body: data });
  return res.data;
}

/** GET /invitations/:token (público) → `{ trainer, student_name, student_email, goal, expires_at }`. */
export function getInvitation(token) {
  return request(`/invitations/${encodeURIComponent(token)}`, { auth: false, refresh: false });
}
