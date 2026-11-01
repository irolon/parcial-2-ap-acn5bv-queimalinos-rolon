import { useState } from 'react';
import { Ruler } from 'lucide-react';
import AnthropometryCard from '@/components/body-metrics/AnthropometryCard';
import DeleteMetricDialog from '@/components/body-metrics/dialogs/DeleteMetricDialog';
import MetricFormDialog from '@/components/body-metrics/dialogs/MetricFormDialog';
import MetricsHistory from '@/components/body-metrics/MetricsHistory';
import WeightChart from '@/components/body-metrics/WeightChart';
import EmptyState from '@/components/shared/states/EmptyState';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Button from '@/components/shared/ui/Button';
import Card from '@/components/shared/ui/Card';
import { useMetricsQuery } from '@/hooks/body-metrics/useBodyMetrics';

// El alumno solo borra las medidas que cargó él: el backend responde 403 si intenta borrar las de su entrenador.
const recordedByStudent = (metric) => metric.recorded_by === 'student';

function Body({ query, onRegister, onDelete }) {
  if (query.isPending) {
    return (
      <Card>
        <LoadingState rows={3} label="Cargando tus medidas…" />
      </Card>
    );
  }
  if (query.isError) {
    return (
      <Card>
        <ErrorState message="No pudimos cargar tus medidas." onRetry={() => query.refetch()} />
      </Card>
    );
  }
  const metrics = query.data;
  if (metrics.length === 0) {
    return (
      <Card>
        <EmptyState icon={Ruler} title="Todavía no hay medidas. Registrá la primera." />
        <div className="flex justify-center pb-6">
          <Button onClick={onRegister}>Registrar medición</Button>
        </div>
      </Card>
    );
  }
  return (
    <>
      <AnthropometryCard
        title="Medidas actuales"
        metrics={metrics}
        extra={
          <Button variant="ghost" size="sm" onClick={onRegister}>
            Registrar medición
          </Button>
        }
      />
      <WeightChart metrics={metrics} />
      <MetricsHistory metrics={metrics} canDelete={recordedByStudent} onDelete={onDelete} />
    </>
  );
}

/**
 * Las medidas del alumno en Mi perfil: las actuales con Registrar medición, la evolución del peso y el historial,
 * donde solo se pueden borrar las que cargó él. Un solo bloque con su carga, su error con Reintentar y su estado vacío.
 */
export default function StudentMetrics({ studentId }) {
  const query = useMetricsQuery(studentId);
  const [registering, setRegistering] = useState(false);
  const [deleting, setDeleting] = useState(null);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Body query={query} onRegister={() => setRegistering(true)} onDelete={setDeleting} />
      {registering && (
        <MetricFormDialog
          studentId={studentId}
          metrics={query.data ?? []}
          title="Registrar medición"
          onClose={() => setRegistering(false)}
        />
      )}
      {deleting && <DeleteMetricDialog studentId={studentId} metric={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
