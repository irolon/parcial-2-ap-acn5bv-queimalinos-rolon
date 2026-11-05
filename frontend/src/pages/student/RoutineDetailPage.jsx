import { Link, useParams } from 'react-router';
import { ArrowLeft, SearchX } from 'lucide-react';
import EmptyState from '@/components/shared/states/EmptyState';
import ErrorState from '@/components/shared/states/ErrorState';
import LoadingState from '@/components/shared/states/LoadingState';
import Card from '@/components/shared/ui/Card';
import RoutineExerciseList from '@/components/student/routines/RoutineExerciseList';
import WorkoutEntry from '@/components/student/WorkoutEntry';
import { useCachedTodayRoutine, useMyRoutines } from '@/hooks/routines/useStudentRoutines';
import { MY_ROUTINES_PATH } from '@/routes/routeTable';
import { exerciseCount, withLastSessionKg } from '@/utils/routines/todayPlan';
import { formatRoutineDaysShort } from '@/utils/students/routineDays';

function BackLink() {
  return (
    <Link
      to={MY_ROUTINES_PATH}
      className="inline-flex items-center gap-1.5 self-start font-display text-sm font-semibold text-accentText hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      Volver a Mis rutinas
    </Link>
  );
}

/**
 * Detalle de una de las rutinas activas del alumno (`/alumno/rutinas/:id`), de solo lectura: se busca entre
 * `/routines/mine` por `routine_id`. Desde acá se empieza esa rutina, o se continúa la sesión que haya abierta. Si es
 * la rutina de hoy y Hoy ya la cargó, la sesión precarga el peso de la última vez (`last_session_kg`, que /mine no trae).
 */
export default function RoutineDetailPage() {
  const { id } = useParams();
  const query = useMyRoutines();
  const today = useCachedTodayRoutine();

  if (query.isPending) return <LoadingState rows={4} label="Cargando la rutina…" />;
  // Un refetch fallido no tapa la rutina que ya cargó: solo se ve el error si no hay nada que mostrar.
  if (query.isError && query.data == null) return <ErrorState message="No pudimos cargar la rutina." onRetry={() => query.refetch()} />;

  const routine = (query.data ?? []).find((item) => item.routine_id === id);
  if (!routine) {
    return (
      <Card>
        <EmptyState icon={SearchX} title="No encontramos esa rutina" text="Puede que ya no esté entre tus rutinas activas." />
        <div className="flex justify-center pb-6">
          <BackLink />
        </div>
      </Card>
    );
  }

  const summary = [formatRoutineDaysShort(routine.days), exerciseCount(routine.exercises)].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-4">
      <BackLink />
      <Card>
        <h2 className="font-display text-[28px] font-bold leading-none tracking-[-1px] text-bone0">{routine.name}</h2>
        <p className="mb-5 mt-2 font-mono text-[11px] text-ink6">{summary}</p>
        <WorkoutEntry
          routine={withLastSessionKg(routine, today.data)}
          startLabel="Empezar esta rutina"
          continueLabel="Continuar la que tenés abierta"
          size="md"
        />
      </Card>
      <RoutineExerciseList exercises={routine.exercises} />
    </div>
  );
}
