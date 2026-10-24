import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import DeleteExerciseDialog from '@/components/exercises/dialogs/DeleteExerciseDialog';
import ExerciseDetailDialog from '@/components/exercises/dialogs/ExerciseDetailDialog';
import ExerciseFormDialog from '@/components/exercises/dialogs/ExerciseFormDialog';
import ExerciseFilters from '@/components/exercises/ExerciseFilters';
import ExerciseGridSkeleton from '@/components/exercises/ExerciseGridSkeleton';
import ExerciseResults from '@/components/exercises/ExerciseResults';
import Button from '@/components/shared/ui/Button';
import QueryState from '@/components/shared/states/QueryState';
import {
  ALL,
  INITIAL_FILTERS,
  filterExercises,
  muscleGroupsIn,
} from '@/utils/exercises/filterExercises';
import { useExercisesQuery } from '@/hooks/exercises/useExercises';

/** Biblioteca de ejercicios del entrenador: globales + propios, con filtros en el cliente. */
export default function ExerciseLibraryPage() {
  const query = useExercisesQuery();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  // Un solo diálogo a la vez; `id` cambia en cada apertura para que el formulario arranque limpio.
  const [dialog, setDialog] = useState(null);
  const openCount = useRef(0);

  // Si el grupo elegido se queda sin ejercicios, el estado vuelve a "Todos" (se ajusta durante el
  // render, sin efecto): así el chip no reaparece activo si después se crea otro de ese grupo.
  const groups = muscleGroupsIn(query.data ?? []);
  if (query.data && filters.muscle !== ALL && !groups.includes(filters.muscle)) {
    setFilters({ ...filters, muscle: ALL });
  }

  const open = (type) => (exercise) => setDialog({ type, exercise, id: ++openCount.current });
  const openCreate = () => open('create')();
  const close = () => setDialog(null);

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-ink6">
          {query.data ? `${query.data.length} EJERCICIOS` : ''}
        </p>
        <Button onClick={openCreate}>
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
          return (
            <>
              <ExerciseFilters filters={filters} groups={groups} onChange={setFilters} />
              <ExerciseResults
                items={filterExercises(exercises, filters)}
                ownOnly={filters.origin === 'own' && !exercises.some((e) => !e.is_global)}
                onCreate={openCreate}
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
      {dialog?.type === 'detail' && (
        <ExerciseDetailDialog
          key={dialog.id}
          exercise={dialog.exercise}
          onClose={close}
          onEdit={open('edit')}
          onDelete={open('delete')}
        />
      )}
      {dialog?.type === 'delete' && (
        <DeleteExerciseDialog key={dialog.id} exercise={dialog.exercise} onClose={close} />
      )}
    </section>
  );
}
