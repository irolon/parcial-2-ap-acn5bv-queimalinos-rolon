import { useMutation } from '@tanstack/react-query';
import { resetStudentPassword } from '@/api/account/account.api';

/** Blanqueo de la clave de un alumno: `mutateAsync()` → `{ temporary_password }` (no se cachea en ningún lado). */
export function useResetStudentPassword(studentId) {
  return useMutation({ mutationFn: () => resetStudentPassword(studentId) });
}
