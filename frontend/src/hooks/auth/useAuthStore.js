import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as authApi from '@/api/auth/auth.api';
import * as studentsApi from '@/api/students/students.api';
import * as accountApi from '@/api/account/account.api';
import { configureClient, isNetworkError } from '@/api/shared/client';

export const SESSION_STORAGE_KEY = 'fittrainer.session';

const EMPTY_SESSION = { user: null, token: null, refreshToken: null };

// 429 del refresh: el cupo por IP se agotó (recargas seguidas, varios PT en la misma red). Es temporal.
const isRateLimited = (err) => err?.status === 429 || err?.code === 'RATE_LIMIT_EXCEEDED';
// 5xx: en producción nginx contesta 502/503/504 con el backend caído.
const isServerDown = (err) => err?.status >= 500;
const isTransientError = (err) => isNetworkError(err) || isRateLimited(err) || isServerDown(err);

// Sin respuesta del servidor (red caída, 429 o 5xx) no se sabe si la sesión sigue válida: se pasa a
// `offline` y se descarta el access, pero `user` y `refreshToken` quedan guardados para reintentar
// (`retry()`). Solo un rechazo del servidor (400/401/403) borra la sesión. Sin `refreshToken` no hay nada que
// reintentar (p. ej. ya cerró sesión): queda `anonymous`, así los guards muestran el login y no "Sin conexión".
function keepSessionOffline(set, get) {
  if (get().refreshToken) set({ token: null, status: 'offline' });
  else set({ ...EMPTY_SESSION, status: 'anonymous' });
}

// El refresh informa si la clave está blanqueada (GX1): se copia al user solo si viene.
function withPasswordFlag(user, data) {
  if (!user || typeof data?.must_change_password !== 'boolean') return user;
  return { ...user, must_change_password: data.must_change_password };
}

function saveSession(set, user, token, refreshToken) {
  set({ user, token, refreshToken, status: 'authenticated' });
  return user;
}

/**
 * Sesión de la web.
 * - `status`: `idle` (sin chequear) → `loading` (restore en curso) → `authenticated` | `anonymous` | `offline`
 *   (sesión guardada sin verificar porque el servidor no responde; `retry()` la vuelve a probar).
 * - Solo `user` y `refreshToken` se guardan en localStorage; el `token` vive en memoria.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...EMPTY_SESSION,
      status: 'idle',

      async login(credentials) {
        try {
          const data = await authApi.login(credentials);
          return saveSession(set, data.user, data.token, data.refresh_token);
        } catch (err) {
          set({ ...EMPTY_SESSION, status: 'anonymous' });
          throw err;
        }
      },

      async register(data) {
        const { trainer, token, refresh_token: refreshToken } = await authApi.register(data);
        return saveSession(set, { ...trainer, role: 'trainer' }, token, refreshToken);
      },

      async joinFromInvitation(data) {
        const { student, token, refresh_token: refreshToken } = await studentsApi.joinFromInvitation(data);
        return saveSession(set, { ...student, role: 'student' }, token, refreshToken);
      },

      // La sesión local se limpia en el acto y la revocación sale sin esperarla (sus errores se ignoran): con el
      // backend caído el pedido puede colgarse hasta el 504, y un `retry()` que vuelva bien en ese lapso no la revive.
      async logout() {
        const { refreshToken } = get();
        if (refreshToken) authApi.logout(refreshToken).catch(() => {});
        set({ ...EMPTY_SESSION, status: 'anonymous' });
      },

      // PUT /auth/password: el refresh de este dispositivo se conserva; el access nuevo ya no trae el flag.
      async changePassword({ current_password, new_password }) {
        const { refreshToken } = get();
        const data = await accountApi.changePassword({ current_password, new_password, refresh_token: refreshToken });
        const { user } = get();
        set({
          token: data.token,
          user: { ...user, must_change_password: false, password_changed_at: data.password_changed_at },
        });
      },

      async restore() {
        const { user, refreshToken } = get();
        if (!user || !refreshToken) {
          set({ ...EMPTY_SESSION, status: 'anonymous' });
          return;
        }
        set({ status: 'loading' });
        try {
          const data = await authApi.refresh(refreshToken);
          set({ token: data.token, user: withPasswordFlag(get().user, data), status: 'authenticated' });
        } catch (err) {
          if (isTransientError(err)) keepSessionOffline(set, get);
          else set({ ...EMPTY_SESSION, status: 'anonymous' });
        }
      },

      // Reintento desde `offline`, sin pasar por `loading` (la pantalla de "Sin conexión" no parpadea).
      async retry() {
        const { status, refreshToken } = get();
        if (status !== 'offline' || !refreshToken) return;
        // Si mientras tanto cerró sesión (u otra cuenta entró), la respuesta ya no le corresponde.
        const stale = () => get().refreshToken !== refreshToken;
        try {
          const data = await authApi.refresh(refreshToken);
          if (!stale()) set({ token: data.token, user: withPasswordFlag(get().user, data), status: 'authenticated' });
        } catch (err) {
          if (stale()) return;
          if (isTransientError(err)) keepSessionOffline(set, get);
          else set({ ...EMPTY_SESSION, status: 'anonymous' });
        }
      },
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ user, refreshToken }) => ({ user, refreshToken }),
    },
  ),
);

// La renovación terminó cuando la sesión ya era otra (cerró sesión o entró otra cuenta): su fallo no la toca.
class StaleRenewalError extends Error {}

// La usa el cliente ante un 401: pide un access nuevo con el refresh guardado.
async function renewAccessToken() {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('Sin refresh token');
  // Si mientras tanto cerró sesión o entró otra cuenta, la respuesta (buena o mala) es de la anterior: no pisa la actual.
  const stale = () => useAuthStore.getState().refreshToken !== refreshToken;
  try {
    const data = await authApi.refresh(refreshToken);
    if (!stale()) useAuthStore.setState({ token: data.token, user: withPasswordFlag(useAuthStore.getState().user, data) });
    return data.token;
  } catch (err) {
    throw stale() ? new StaleRenewalError('La sesión cambió durante la renovación', { cause: err }) : err;
  }
}

configureClient({
  getToken: () => useAuthStore.getState().token,
  refreshSession: renewAccessToken,
  // Si la renovación falla: sin respuesta del servidor pasa a `offline` (los guards muestran "Sin conexión");
  // si el servidor la rechaza, logout y el router manda a /login.
  onAuthFailure: (err) => {
    if (err instanceof StaleRenewalError) return;
    if (isTransientError(err)) keepSessionOffline(useAuthStore.setState, useAuthStore.getState);
    else useAuthStore.getState().logout();
  },
});
