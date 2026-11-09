import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

/** Cambia la clave con el store (guarda el access nuevo). `submit` tira el `ApiError` si falla. */
export function useChangePassword() {
  const changePassword = useAuthStore((state) => state.changePassword);
  const mutation = useMutation({ mutationFn: changePassword });
  return { submit: mutation.mutateAsync, isPending: mutation.isPending };
}
