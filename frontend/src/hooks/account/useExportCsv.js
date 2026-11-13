import { useMutation } from '@tanstack/react-query';
import { exportSessions } from '@/api/account/account.api';
import { todayString } from '@/utils/dates';
import { downloadText } from '@/utils/download';

/**
 * Baja el CSV de sesiones: el de un alumno (`studentId`) o el de todos los del PT (sin `studentId`).
 * El archivo se llama `<filenamePrefix>-<aaaa-mm-dd>.csv` con la fecha de la descarga, no la del render: una página
 * abierta desde ayer baja el de hoy. `download` no tira: el error queda en `error`.
 */
export function useExportCsv({ studentId, filenamePrefix }) {
  const mutation = useMutation({
    mutationFn: () => exportSessions(studentId),
    onSuccess: (csv) => downloadText(csv, `${filenamePrefix}-${todayString()}.csv`, 'text/csv'),
  });
  const download = () => mutation.mutateAsync().catch(() => {});
  return { download, isPending: mutation.isPending, error: mutation.error };
}
