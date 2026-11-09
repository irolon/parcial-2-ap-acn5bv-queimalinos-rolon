import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPreferences, savePreferences } from '@/api/notifications/preferences.api';

export const PREFERENCES_KEY = ['notifications', 'preferences'];

/**
 * Preferencias de push del alumno (GX3): `query` es `GET /notifications/preferences`; `save(prefs)` hace el PUT con los
 * cinco y deja la respuesta en la caché. `save` tira el `ApiError` si falla. `enabled: false` no pide nada.
 */
export function useNotificationPrefs({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: PREFERENCES_KEY, queryFn: getPreferences, enabled });
  const mutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: (data) => queryClient.setQueryData(PREFERENCES_KEY, data),
  });
  return {
    query,
    save: async (prefs) => {
      await mutation.mutateAsync(prefs);
    },
    isSaving: mutation.isPending,
  };
}
