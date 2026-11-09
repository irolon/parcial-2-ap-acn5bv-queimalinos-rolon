import { useMutation } from '@tanstack/react-query';
import { exportSessions } from '@/api/account/account.api';
import { downloadText } from '@/utils/download';

/**
 * Baja el CSV de sesiones: el de un alumno (`studentId`) o el de todos los del PT (sin `studentId`).
 * `filename` lo arma quien llama (con la fecha del día). `download` no tira: el error queda en `error`.
 */
export function useExportCsv({ studentId, filename }) {
  const mutation = useMutation({
    mutationFn: () => exportSessions(studentId),
    onSuccess: (csv) => downloadText(csv, filename, 'text/csv'),
  });
  const download = () => mutation.mutateAsync().catch(() => {});
  return { download, isPending: mutation.isPending, error: mutation.error };
}
