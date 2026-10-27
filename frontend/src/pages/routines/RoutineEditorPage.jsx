import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import DraftBanner from '@/components/routines/editor/DraftBanner';
import ExerciseTable from '@/components/routines/editor/ExerciseTable';
import RoutineHeader from '@/components/routines/editor/RoutineHeader';
import LibraryPanel from '@/components/routines/library/LibraryPanel';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import { useExercisesQuery } from '@/hooks/exercises/useExercises';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useRoutineDraft } from '@/hooks/routines/useRoutineDraft';
import { useSecondsSince } from '@/hooks/routines/useSecondsSince';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { clearDraft, readDraft, restoreDraft } from '@/utils/routines/draft';
import * as editor from '@/utils/routines/editorState';
import { validateRoutine } from '@/utils/routines/routineForm';

const NO_DRAFT = { ready: false, restored: false, missing: 0 };

/** Editor de rutinas: biblioteca a la izquierda, cabecera y tabla editable a la derecha, con borrador local. */
export default function RoutineEditorPage() {
  const trainerId = useAuthStore((s) => s.user?.id);
  const exercisesQuery = useExercisesQuery();
  const library = exercisesQuery.data;
  const byId = useMemo(() => new Map((library ?? []).map((e) => [e.id, e])), [library]);
  const [state, setState] = useState(editor.EMPTY_ROUTINE);
  const [draft, setDraft] = useState(NO_DRAFT);
  const [attempted, setAttempted] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const apply = (fn, ...args) => setState((current) => fn(current, ...args));

  if (library && !draft.ready) {
    // Se intenta restaurar una sola vez, con la biblioteca ya cargada (ver `useRoutineDraft`).
    const found = trainerId ? restoreDraft(readDraft(trainerId), byId) : null;
    if (found) setState(found.state);
    setDraft({ ready: true, restored: Boolean(found), missing: found?.missing ?? 0 });
  }

  const { savedAt } = useRoutineDraft(trainerId, state, { enabled: draft.ready });
  const seconds = useSecondsSince(savedAt);
  usePageHeader({
    title: state.name ? `Nueva rutina — ${state.name}` : 'Nueva rutina',
    subtitle: `RUTINAS › CREAR${seconds === null ? '' : ` · AUTO-GUARDADO · HACE ${seconds}S`}`,
  });

  const errors = attempted ? validateRoutine(state) : null;
  const discard = () => {
    clearDraft(trainerId);
    setState(editor.EMPTY_ROUTINE);
    setDraft({ ...draft, restored: false, missing: 0 });
  };
  const handleAssign = () => {
    setAttempted(true);
    // Task 5: si `validateRoutine(state).count === 0`, abre el modal de asignación.
  };

  return (
    <section className="flex flex-col gap-5">
      {draft.restored && <DraftBanner missing={draft.missing} onDiscard={discard} />}
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <Button variant="ghost" className="mb-3 lg:hidden" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((o) => !o)}>
            <Plus size={16} aria-hidden="true" /> Agregar ejercicio
          </Button>
          <div className={libraryOpen ? 'block' : 'hidden lg:block'}>
            <QueryState query={exercisesQuery} empty={{ title: 'Todavía no hay ejercicios' }}>
              {(items) => <LibraryPanel exercises={items} onAdd={(id) => apply(editor.addExercise, id)} />}
            </QueryState>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-5">
          {errors?.count > 0 && (
            <p role="alert" className="font-mono text-xs text-hot">
              <span className="block">Revisá {errors.count} {errors.count === 1 ? 'campo' : 'campos'}</span>
              {errors.form && <span className="block">{errors.form}</span>}
            </p>
          )}
          <RoutineHeader
            state={state}
            errors={errors?.header}
            onChange={(field, value) => apply(editor.updateHeader, field, value)}
            onToggleDay={(day) => apply(editor.toggleDay, day)}
          />
          <ExerciseTable
            exercises={state.exercises}
            byId={byId}
            errors={errors?.exercises}
            onChange={(key, field, value) => apply(editor.updateExercise, key, field, value)}
            onMove={(key, delta) => apply(editor.moveBy, key, delta)}
            onRemove={(key) => apply(editor.removeExercise, key)}
          />
          <div className="flex justify-end">
            <Button onClick={handleAssign}>Asignar a alumno</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
