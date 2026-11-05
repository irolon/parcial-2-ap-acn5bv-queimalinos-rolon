import { List } from 'lucide-react';
import LoadingState from '@/components/shared/states/LoadingState';
import QueryState from '@/components/shared/states/QueryState';
import RoutineCard from '@/components/student/routines/RoutineCard';
import { useMyRoutines } from '@/hooks/routines/useStudentRoutines';

/** Mis rutinas: las rutinas activas del alumno, cada una con su detalle de solo lectura. */
export default function MyRoutinesPage() {
  const query = useMyRoutines();
  return (
    <QueryState
      query={query}
      loading={<LoadingState rows={3} label="Cargando tus rutinas…" />}
      errorMessage="No pudimos cargar tus rutinas."
      empty={{
        icon: List,
        title: 'Tu entrenador todavía no te asignó una rutina',
        text: 'Cuando te asigne una, la vas a ver acá.',
      }}
    >
      {(routines) => (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {routines.map((routine) => (
            <RoutineCard key={routine.routine_id} routine={routine} />
          ))}
        </ul>
      )}
    </QueryState>
  );
}
