import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, updateMe } from '@/api/account/profile.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

export const ME_KEY = ['account', 'me'];

/**
 * Perfil del PT logueado (GX2): `query` es `GET /auth/me`; `save(body)` hace el PATCH,
 * deja la respuesta en la caché y actualiza el `user` del store (el sidebar muestra el nombre nuevo).
 * `save` tira el `ApiError` si falla.
 */
export function useTrainerProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);
  const query = useQuery({ queryKey: ME_KEY, queryFn: getMe });
  const mutation = useMutation({
    mutationFn: updateMe,
    onSuccess: (data) => {
      queryClient.setQueryData(ME_KEY, data);
      updateUser({ name: data.name, professional_title: data.professional_title });
    },
  });
  return {
    query,
    save: async (body) => {
      await mutation.mutateAsync(body);
    },
    saving: mutation.isPending,
  };
}
