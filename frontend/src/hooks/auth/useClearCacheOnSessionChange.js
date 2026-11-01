import { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';

/**
 * Vacía la caché de TanStack Query cuando cambia el usuario de la sesión (cerrar sesión o entrar con otro):
 * las claves de las queries no incluyen al usuario, así que sin esto el siguiente vería datos del anterior
 * hasta que termine el refetch. Renovar el token o editar el perfil (mismo `id`) no la toca.
 */
export function useClearCacheOnSessionChange(queryClient) {
  useEffect(() => {
    let userId = useAuthStore.getState().user?.id ?? null;
    return useAuthStore.subscribe((state) => {
      const next = state.user?.id ?? null;
      if (next === userId) return;
      userId = next;
      queryClient.clear();
    });
  }, [queryClient]);
}
