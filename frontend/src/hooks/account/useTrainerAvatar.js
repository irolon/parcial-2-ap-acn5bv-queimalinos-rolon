import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeAvatar, uploadAvatar } from '@/api/account/profile.api';
import { ME_KEY } from '@/hooks/account/useTrainerProfile';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resizeToJpeg } from '@/utils/students/profile/resizeImage';

/**
 * Foto del PT logueado (misma forma que `useAvatar` del alumno). `upload(file)` la achica a 512 px y la sube;
 * `remove()` la quita. Al terminar bien deja la URL nueva en `/auth/me` (Tu perfil) y en el `user` (sidebar y
 * topbar). Los errores se tiran para que el componente elija el texto.
 */
export function useTrainerAvatar() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  const applyAvatar = (avatarUrl) => {
    queryClient.setQueryData(ME_KEY, (me) => (me ? { ...me, avatar_url: avatarUrl } : me));
    updateUser({ avatar_url: avatarUrl });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file) => uploadAvatar(await resizeToJpeg(file)),
    onSuccess: applyAvatar,
  });
  const removeMutation = useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: () => applyAvatar(null),
  });

  return {
    upload: async (file) => {
      await uploadMutation.mutateAsync(file);
    },
    remove: async () => {
      await removeMutation.mutateAsync();
    },
    uploading: uploadMutation.isPending,
    removing: removeMutation.isPending,
  };
}
