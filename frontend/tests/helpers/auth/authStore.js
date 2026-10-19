import { SESSION_STORAGE_KEY, useAuthStore } from '@/hooks/auth/useAuthStore';

export const USER = { id: 'u-1', email: 'pt@fit.com', full_name: 'Pablo', role: 'trainer' };

export const LOGIN_RESPONSE = {
  user: USER,
  token: 'access-1',
  refresh_token: 'refresh-1',
  expires_in: '1h',
};

/** Vuelve el store y localStorage a cero entre tests. */
export function resetAuthStore() {
  useAuthStore.setState({ user: null, token: null, refreshToken: null, status: 'idle' });
  localStorage.clear();
}

/** Simula una sesión guardada de una visita anterior y rehidrata el store. */
export async function seedSavedSession(session = { user: USER, refreshToken: 'refresh-1' }) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ state: session, version: 0 }));
  await useAuthStore.persist.rehydrate();
}

/** Lo que quedó guardado en localStorage (o null). */
export function savedSession() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? JSON.parse(raw).state : null;
}
