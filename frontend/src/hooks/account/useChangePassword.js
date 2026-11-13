import { useIsMutating, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/auth/useAuthStore';

const CHANGE_PASSWORD_KEY = ['account', 'change-password'];

/** Cambia la clave con el store (guarda el access nuevo). `submit` tira el `ApiError` si falla. */
export function useChangePassword() {
  const changePassword = useAuthStore((state) => state.changePassword);
  const mutation = useMutation({ mutationKey: CHANGE_PASSWORD_KEY, mutationFn: changePassword });
  return { submit: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Si hay un cambio de clave en curso (para el botón Guardar que vive fuera del `<form>`). */
export const useIsChangingPassword = () => useIsMutating({ mutationKey: CHANGE_PASSWORD_KEY }) > 0;
