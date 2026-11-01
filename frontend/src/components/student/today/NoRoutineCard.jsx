import { ClipboardList, Moon } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import { nextTrainingDay } from '@/utils/routines/week';

/**
 * Hoy sin rutina del día, según las rutinas activas del alumno (`routines`, la consulta de /routines/mine):
 * sin ninguna asignada, "Tu entrenador todavía no te asignó una rutina"; con rutinas, "Hoy es descanso" y el próximo día.
 */
export default function NoRoutineCard({ routines, now }) {
  if (routines.isPending) {
    return <Card><LoadingState rows={1} label="Cargando tus rutinas…" /></Card>;
  }
  if (routines.isError) {
    return <Card><ErrorState message="No pudimos cargar tus rutinas." onRetry={() => routines.refetch()} /></Card>;
  }
  const assigned = routines.data ?? [];
  if (assigned.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardList}
          title="Tu entrenador todavía no te asignó una rutina"
          text="Cuando te asigne una, la vas a ver acá."
        />
      </Card>
    );
  }
  const next = nextTrainingDay(assigned, now);
  return (
    <Card>
      <EmptyState icon={Moon} title="Hoy es descanso" text={next ? `Próximo: ${next}` : undefined} />
    </Card>
  );
}
