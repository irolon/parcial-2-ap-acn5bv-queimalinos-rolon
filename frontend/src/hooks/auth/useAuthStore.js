import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as authApi from '@/api/auth/auth.api';
import { configureClient } from '@/api/shared/client';

export const SESSION_STORAGE_KEY = 'fittrainer.session';

const EMPTY_SESSION = { user: null, token: null, refreshToken: null };

const isNetworkError = (err) => err?.status === 0 || err?.code === 'NETWORK_ERROR';

// Sin conexión con el servidor no se sabe si la sesión sigue válida: se pasa a
// `anonymous` y se descarta el access, pero `user` y `refreshToken` quedan guardados
// para reintentar en la próxima carga.
function keepSessionOffline(set) {
  set({ token: null, status: 'anonymous' });
}

/**
 * Sesión de la web.
 * - `status`: `idle` (sin chequear) → `loading` (restore en curso) → `authenticated` | `anonymous`.
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
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refresh_token,
            status: 'authenticated',
          });
          return data.user;
        } catch (err) {
          set({ ...EMPTY_SESSION, status: 'anonymous' });
          throw err;
        }
      },

      async logout() {
        const { refreshToken } = get();
        try {
          if (refreshToken) await authApi.logout(refreshToken);
        } catch {
          // Aunque el backend falle, la sesión local se limpia igual.
        } finally {
          set({ ...EMPTY_SESSION, status: 'anonymous' });
        }
      },

      async restore() {
        const { user, refreshToken } = get();
        if (!user || !refreshToken) {
          set({ ...EMPTY_SESSION, status: 'anonymous' });
          return;
        }
        set({ status: 'loading' });
        try {
          const { token } = await authApi.refresh(refreshToken);
          set({ token, status: 'authenticated' });
        } catch (err) {
          if (isNetworkError(err)) keepSessionOffline(set);
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

// La usa el cliente ante un 401: pide un access nuevo con el refresh guardado.
async function renewAccessToken() {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('Sin refresh token');
  const { token } = await authApi.refresh(refreshToken);
  useAuthStore.setState({ token });
  return token;
}

configureClient({
  getToken: () => useAuthStore.getState().token,
  refreshSession: renewAccessToken,
  // Si la renovación falla, el status pasa a `anonymous` y el router manda a /login.
  onAuthFailure: (err) => {
    if (isNetworkError(err)) keepSessionOffline(useAuthStore.setState);
    else useAuthStore.getState().logout();
  },
});
