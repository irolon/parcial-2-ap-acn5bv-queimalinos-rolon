import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import AutosaveHeader from '@/components/routines/editor/AutosaveHeader';
import DraftBanner from '@/components/routines/editor/DraftBanner';
import ExerciseTable from '@/components/routines/editor/ExerciseTable';
import RoutineHeader from '@/components/routines/editor/RoutineHeader';
import RoutineDialogs from '@/components/routines/dialogs/RoutineDialogs';
import LibraryPanel from '@/components/routines/library/LibraryPanel';
import LibraryErrorAlert from '@/components/routines/library/LibraryErrorAlert';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import { useExercisesQuery } from '@/hooks/exercises/useExercises';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useRoutineDraft } from '@/hooks/routines/useRoutineDraft';
import { profileHref } from '@/routes/routeTable';
import { clearDraft, readDraft, restoreDraft } from '@/utils/routines/draft';
import * as editor from '@/utils/routines/editorState';
import { validateRoutine } from '@/utils/routines/routineForm';
import { serverErrorsFor, templateErrorsFor } from '@/utils/routines/serverErrors';

const missingNotice = (n) => `Quitamos ${n} ${n === 1 ? 'ejercicio que ya no está' : 'ejercicios que ya no están'} en la biblioteca`;
const NO_DRAFT = { ready: false, restored: false, missing: 0 };

/** Editor de rutinas: biblioteca a la izquierda, cabecera y tabla editable a la derecha, con borrador local. */
export default function RoutineEditorPage() {
  const trainerId = useAuthStore((s) => s.user?.id);
  const exercisesQuery = useExercisesQuery();
  const library = exercisesQuery.data;
  // Un refetch fallido con la biblioteca ya cargada no esconde el panel ni avisa: el editor sigue andando.
  const failed = exercisesQuery.isError && !library;
  const byId = useMemo(() => new Map((library ?? []).map((e) => [e.id, e])), [library]);
  const [state, setState] = useState(editor.EMPTY_ROUTINE);
  const [draft, setDraft] = useState(NO_DRAFT);
  const [attempted, setAttempted] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [serverErrors, setServerErrors] = useState(null);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const replaceState = (next) => {
    setState(next);
    setServerErrors(null);
  };
  const apply = (fn, ...args) => {
    setState((current) => fn(current, ...args));
    setServerErrors(null);
  };

  if (library && !draft.ready) {
    // Se intenta restaurar una sola vez, con la biblioteca ya cargada (ver `useRoutineDraft`).
    // Si ya hay algo escrito no se pisa: se marca listo sin restaurar.
    const found = trainerId && editor.isBlank(state) ? restoreDraft(readDraft(trainerId), byId) : null;
    if (found) setState(found.state);
    setDraft({ ready: true, restored: Boolean(found), missing: found?.missing ?? 0 });
  }

  const { savedAt, cancel: cancelDraft } = useRoutineDraft(trainerId, state, { enabled: draft.ready });

  const errors = serverErrors ?? (attempted ? validateRoutine(state) : null);
  const discard = () => {
    clearDraft(trainerId);
    replaceState(editor.EMPTY_ROUTINE);
    setDraft({ ...draft, restored: false, missing: 0 });
  };
  const handleAssign = () => {
    setAttempted(true);
    if (validateRoutine(state).count === 0) setDialog({ type: 'assign' });
  };
  const on = {
    close: () => setDialog(null),
    hasContent: !editor.isBlank(state),
    assigned: (student) => {
      cancelDraft();
      navigate(profileHref(student.id));
    },
    invalid: (error) => setServerErrors(serverErrorsFor(error, state)),
    templateGone: () => apply(editor.clearTemplate),
    invalidRows: () => setAttempted(true),
    invalidTemplate: (error) => setServerErrors(templateErrorsFor(error, state)),
    load: (next, missing) => {
      replaceState(next);
      setAttempted(false);
      setNotice(missing > 0 ? missingNotice(missing) : null);
      setDialog(null);
    },
    saved: () => {
      setNotice('Plantilla guardada');
      setDialog(null);
    },
  };

  return (
    <section className="flex flex-col gap-5">
      <AutosaveHeader name={state.name} savedAt={savedAt} />
      {failed && <LibraryErrorAlert onRetry={() => exercisesQuery.refetch()} />}
      {draft.restored && <DraftBanner missing={draft.missing} onDiscard={discard} />}
      {notice && <p role="status" className="font-body text-sm text-ink6">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <Button variant="ghost" className="mb-3 lg:hidden" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((o) => !o)}>
            <Plus size={16} aria-hidden="true" /> Agregar ejercicio
          </Button>
          <div className={libraryOpen ? 'block' : 'hidden lg:block'}>
            {failed ? (
              <p className="font-body text-sm text-ink6">No pudimos cargar los ejercicios.</p>
            ) : (
              <QueryState query={{ ...exercisesQuery, isError: false }} empty={{ title: 'Todavía no hay ejercicios' }}>
                {(items) => <LibraryPanel exercises={items} onAdd={(id) => apply(editor.addExercise, id)} />}
              </QueryState>
            )}
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
            disabled={!draft.ready}
            errors={errors?.header}
            onChange={(field, value) => apply(editor.updateHeader, field, value)}
            onToggleDay={(day) => apply(editor.toggleDay, day)}
            onClearTemplate={() => apply(editor.clearTemplate)}
          />
          <ExerciseTable
            exercises={state.exercises}
            byId={byId}
            errors={errors?.exercises}
            onChange={(key, field, value) => apply(editor.updateExercise, key, field, value)}
            onMove={(key, delta) => apply(editor.moveBy, key, delta)}
            onReorder={(from, to) => apply(editor.moveExercise, from, to)}
            onRemove={(key) => apply(editor.removeExercise, key)}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" disabled={!draft.ready} onClick={() => setDialog({ type: 'template' })}>Usar plantilla</Button>
            <Button variant="ghost" disabled={!draft.ready} onClick={() => setDialog({ type: 'save' })}>Guardar como plantilla</Button>
            <Button disabled={!draft.ready} onClick={handleAssign}>Asignar a alumno</Button>
          </div>
        </div>
      </div>
      <RoutineDialogs dialog={dialog} state={state} byId={byId} preselectedStudentId={params.get('alumno')} on={on} />
    </section>
  );
}
