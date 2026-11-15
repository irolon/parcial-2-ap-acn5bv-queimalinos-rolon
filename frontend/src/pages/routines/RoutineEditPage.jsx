import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Link, useParams } from 'react-router';
import ConflictDialog from '@/components/routines/edit/ConflictDialog';
import EditHeader from '@/components/routines/edit/EditHeader';
import EditMessages from '@/components/routines/edit/EditMessages';
import ReplaceBanner from '@/components/routines/edit/ReplaceBanner';
import ExerciseTable from '@/components/routines/editor/ExerciseTable';
import RoutineHeader from '@/components/routines/editor/RoutineHeader';
import LibraryPanel from '@/components/routines/library/LibraryPanel';
import LibraryErrorAlert from '@/components/routines/library/LibraryErrorAlert';
import QueryState from '@/components/shared/states/QueryState';
import Button, { buttonClass } from '@/components/shared/ui/Button';
import { useExercisesQuery } from '@/hooks/exercises/useExercises';
import { useRoutineEdit } from '@/hooks/routines/useRoutineEdit';
import { ROUTINES_PATH } from '@/routes/routeTable';
import { libraryWith } from '@/utils/routines/edit/fromRoutine';
import * as editor from '@/utils/routines/editorState';
import { validateRoutine } from '@/utils/routines/routineForm';

/**
 * Editor en modo edición de una rutina ya asignada (`/pt/rutinas/:id/editar`): la misma biblioteca, cabecera y tabla
 * del alta, más "Reemplazar" en el menú de cada fila. Guarda solo lo que cambió (`useRoutineEdit`); sin borrador local.
 */
export default function RoutineEditPage() {
  const { id } = useParams();
  const exercisesQuery = useExercisesQuery();
  const library = exercisesQuery.data;
  const failed = exercisesQuery.isError && !library;
  const edit = useRoutineEdit(id);
  const { state, status, baseline } = edit;
  const byId = useMemo(() => libraryWith(new Map((library ?? []).map((e) => [e.id, e])), baseline), [library, baseline]);
  const [attempted, setAttempted] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [replacing, setReplacing] = useState(null);

  const apply = (fn, ...args) => {
    if (status.saving) return; // lo que se toque mientras guarda se perdería al recargar la rutina del servidor
    edit.setState((current) => fn(current, ...args));
    edit.clearMessages();
  };
  const replacingRow = state?.exercises.find((e) => e.key === replacing) ?? null;
  const pick = (exerciseId) => {
    if (!replacingRow) return apply(editor.addExercise, exerciseId);
    apply(editor.replaceExercise, replacingRow.key, exerciseId);
    return setReplacing(null);
  };
  const startReplace = (key) => {
    if (status.saving) return;
    setReplacing(key);
    setLibraryOpen(true);
  };
  const validate = () => validateRoutine(state, { goalOptional: !baseline.goal });
  const handleSave = () => {
    setAttempted(true);
    if (validate().count === 0) edit.save();
  };
  const discard = () => {
    setAttempted(false);
    setReplacing(null);
    edit.discard();
  };
  const errors = attempted && state ? validate() : null;

  return (
    <section className="flex flex-col gap-5">
      <EditHeader name={baseline?.name} />
      <QueryState query={edit.query}>
        {() => state && (
          <>
            {failed && <LibraryErrorAlert onRetry={() => exercisesQuery.refetch()} />}
            <EditMessages inactive={baseline.active === false} status={status} errors={errors} />
            {replacingRow && (
              <ReplaceBanner name={byId.get(replacingRow.exercise_id)?.name ?? 'este ejercicio'} onCancel={() => setReplacing(null)} />
            )}
            {/* Mientras guarda, todo el editor queda deshabilitado (cabecera, tabla, menú de fila y biblioteca). */}
            <fieldset disabled={status.saving} aria-busy={status.saving} className="m-0 grid min-w-0 gap-6 border-0 p-0 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="min-w-0">
                <Button variant="ghost" className="mb-3 lg:hidden" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((o) => !o)}>
                  <Plus size={16} aria-hidden="true" /> Agregar ejercicio
                </Button>
                <div className={libraryOpen ? 'block' : 'hidden lg:block'}>
                  {failed ? (
                    <p className="font-body text-sm text-ink6">No pudimos cargar los ejercicios.</p>
                  ) : (
                    <QueryState query={{ ...exercisesQuery, isError: false }} empty={{ title: 'Todavía no hay ejercicios' }}>
                      {(items) => <LibraryPanel exercises={items} onAdd={pick} />}
                    </QueryState>
                  )}
                </div>
              </aside>
              <div className="flex min-w-0 flex-col gap-5">
                <RoutineHeader
                  state={state}
                  errors={errors?.header}
                  onChange={(field, value) => apply(editor.updateHeader, field, value)}
                  onToggleDay={(day) => apply(editor.toggleDay, day)}
                  onClearTemplate={() => {}}
                />
                <ExerciseTable
                  exercises={state.exercises}
                  byId={byId}
                  errors={errors?.exercises}
                  onChange={(key, field, value) => apply(editor.updateExercise, key, field, value)}
                  onMove={(key, delta) => apply(editor.moveBy, key, delta)}
                  onReorder={(from, to) => apply(editor.moveExercise, from, to)}
                  onRemove={(key) => apply(editor.removeExercise, key)}
                  onReplace={startReplace}
                />
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Link to={ROUTINES_PATH} className={buttonClass({ variant: 'ghost' })}>Volver a rutinas</Link>
                  <Button variant="ghost" disabled={!edit.dirty || status.saving} onClick={discard}>Descartar cambios</Button>
                  <Button disabled={!edit.dirty || status.saving} onClick={handleSave}>
                    {status.saving ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            </fieldset>
          </>
        )}
      </QueryState>
      {status.conflict && (
        <ConflictDialog
          onReload={edit.reloadFromConflict}
          onSaveAnyway={() => edit.save({ force: true })}
          onClose={edit.closeConflict}
        />
      )}
    </section>
  );
}
