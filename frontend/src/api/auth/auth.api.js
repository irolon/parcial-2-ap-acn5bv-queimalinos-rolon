import { request } from '@/api/shared/client';

// Las rutas de auth nunca disparan la renovación automática (`refresh: false`).

/** POST /auth/login → `{ user, token, refresh_token, expires_in }`. */
export function login({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
    refresh: false,
  });
}

/** POST /auth/refresh → `{ token, expires_in }` (el refresh no rota). */
export function refresh(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    auth: false,
    refresh: false,
  });
}

/** POST /auth/logout con Bearer → 204 (`null`). */
export function logout(refreshToken) {
  return request('/auth/logout', {
    method: 'POST',
    body: { refresh_token: refreshToken },
    refresh: false,
  });
}
