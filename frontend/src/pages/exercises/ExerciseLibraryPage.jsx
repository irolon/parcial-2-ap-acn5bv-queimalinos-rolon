import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import ExerciseFormDialog from '@/components/exercises/ExerciseFormDialog';
import ExerciseFilters from '@/components/exercises/ExerciseFilters';
import ExerciseGridSkeleton from '@/components/exercises/ExerciseGridSkeleton';
import ExerciseResults from '@/components/exercises/ExerciseResults';
import Button from '@/components/shared/ui/Button';
import QueryState from '@/components/shared/states/QueryState';
import {
  INITIAL_FILTERS,
  effectiveMuscle,
  filterExercises,
  muscleGroupsIn,
} from '@/hooks/exercises/filterExercises';
import { useExercisesQuery } from '@/hooks/exercises/useExercises';

/** Biblioteca de ejercicios del entrenador: globales + propios, con filtros en el cliente. */
export default function ExerciseLibraryPage() {
  const query = useExercisesQuery();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  // Un solo diálogo a la vez; `id` cambia en cada apertura para que el formulario arranque limpio.
  const [dialog, setDialog] = useState(null);
  const openCount = useRef(0);

  const open = (type) => (exercise) => setDialog({ type, exercise, id: ++openCount.current });
  const close = () => setDialog(null);

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink6">
          {query.data ? `${query.data.length} EJERCICIOS` : ''}
        </p>
        <Button onClick={() => open('create')()}>
          <Plus size={16} aria-hidden="true" />
          Nuevo ejercicio
        </Button>
      </header>
      <QueryState
        query={query}
        loading={<ExerciseGridSkeleton />}
        empty={{ title: 'Todavía no hay ejercicios' }}
      >
        {(exercises) => {
          const groups = muscleGroupsIn(exercises);
          const current = { ...filters, muscle: effectiveMuscle(filters, groups) };
          return (
            <>
              <ExerciseFilters filters={current} groups={groups} onChange={setFilters} />
              <ExerciseResults
                items={filterExercises(exercises, current)}
                ownOnly={filters.origin === 'own' && !exercises.some((e) => !e.is_global)}
                onCreate={() => open('create')()}
                onClear={() => setFilters(INITIAL_FILTERS)}
                onOpen={open('detail')}
                onEdit={open('edit')}
                onDelete={open('delete')}
              />
            </>
          );
        }}
      </QueryState>
      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <ExerciseFormDialog key={dialog.id} open exercise={dialog.exercise} onClose={close} />
      )}
    </section>
  );
}
