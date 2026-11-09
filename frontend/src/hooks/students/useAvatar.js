import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeAvatar, uploadAvatar } from '@/api/students/avatar.api';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { STUDENTS_KEY } from '@/hooks/students/useStudents';
import { resizeToJpeg } from '@/utils/students/resizeImage';

export const AVATAR_ERRORS = {
  IMAGE_TOO_LARGE: 'La foto supera 5 MB',
  IMAGE_TYPE_INVALID: 'Usá una foto JPG, PNG o WebP',
};

/** Texto del error de la foto: el código del `ApiError` (o el `message` del achicado); si no, `fallback`. */
export function avatarErrorMessage(error, fallback) {
  return AVATAR_ERRORS[error?.code] ?? AVATAR_ERRORS[error?.message] ?? fallback;
}

/**
 * Foto del propio alumno (GX2). `upload(file)` la achica a 512 px y la sube; `remove()` la quita.
 * Al terminar bien deja la URL nueva en la ficha, en el listado y en el `user` (sidebar y topbar).
 * Los errores se tiran para que el componente elija el texto.
 */
export function useAvatar(studentId) {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);

  const applyAvatar = (avatarUrl) => {
    queryClient.setQueryData([...STUDENTS_KEY, studentId], (student) =>
      student ? { ...student, avatar_url: avatarUrl } : student,
    );
    queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    updateUser({ avatar_url: avatarUrl });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file) => uploadAvatar(studentId, await resizeToJpeg(file)),
    onSuccess: applyAvatar,
  });
  const removeMutation = useMutation({
    mutationFn: () => removeAvatar(studentId),
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
