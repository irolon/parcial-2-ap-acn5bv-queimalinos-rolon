import { useState } from 'react';
import Button from '@/components/shared/ui/Button';
import Dialog from '@/components/shared/ui/Dialog';
import { useDeleteMetric } from '@/hooks/body-metrics/useBodyMetrics';
import { formatMetricDate } from '@/utils/body-metrics/metrics';
import { fieldErrorsFrom } from '@/utils/fieldErrors';

/** Confirmación de borrado de una medida; ante un error queda abierto con el mensaje. */
export default function DeleteMetricDialog({ studentId, metric, onClose }) {
  const [error, setError] = useState(null);
  const remove = useDeleteMetric(studentId);

  async function handleDelete() {
    if (remove.isPending) return;
    setError(null);
    try {
      await remove.mutateAsync(metric.id);
      onClose();
    } catch (err) {
      setError(fieldErrorsFrom(err, { fields: [], fallback: 'No pudimos borrar la medida' }).form);
    }
  }

  return (
    <Dialog
      open
      dismissible={!remove.isPending}
      onOpenChange={(next) => !next && onClose()}
      title={`¿Borrar la medida del ${formatMetricDate(metric.recorded_at)}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={remove.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>
            Borrar
          </Button>
        </>
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-hot/25 bg-hot/[0.14] px-3 py-2.5 font-body text-sm text-hot"
        >
          {error}
        </p>
      )}
      <p className="font-body text-sm text-ink6">Esta acción no se puede deshacer.</p>
    </Dialog>
  );
}
