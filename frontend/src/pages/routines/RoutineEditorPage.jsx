import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import DraftBanner from '@/components/routines/editor/DraftBanner';
import ExerciseTable from '@/components/routines/editor/ExerciseTable';
import RoutineHeader from '@/components/routines/editor/RoutineHeader';
import RoutineDialogs from '@/components/routines/dialogs/RoutineDialogs';
import LibraryPanel from '@/components/routines/library/LibraryPanel';
import QueryState from '@/components/shared/states/QueryState';
import Button from '@/components/shared/ui/Button';
import { useExercisesQuery } from '@/hooks/exercises/useExercises';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useRoutineDraft } from '@/hooks/routines/useRoutineDraft';
import { useSecondsSince } from '@/hooks/routines/useSecondsSince';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { profileHref } from '@/routes/routeTable';
import { clearDraft, readDraft, restoreDraft } from '@/utils/routines/draft';
import * as editor from '@/utils/routines/editorState';
import { serverErrorsFor, validateRoutine } from '@/utils/routines/routineForm';

const missingNotice = (n) => `Quitamos ${n} ${n === 1 ? 'ejercicio que ya no está' : 'ejercicios que ya no están'} en la biblioteca`;
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
    assigned: (student) => navigate(profileHref(student.id)),
    invalid: (error) => setServerErrors(serverErrorsFor(error, state)),
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
      {draft.restored && <DraftBanner missing={draft.missing} onDiscard={discard} />}
      {notice && <p role="status" className="font-body text-sm text-ink6">{notice}</p>}
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
            onReorder={(from, to) => apply(editor.moveExercise, from, to)}
            onRemove={(key) => apply(editor.removeExercise, key)}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialog({ type: 'template' })}>Usar plantilla</Button>
            <Button variant="ghost" onClick={() => setDialog({ type: 'save' })}>Guardar como plantilla</Button>
            <Button onClick={handleAssign}>Asignar a alumno</Button>
          </div>
        </div>
      </div>
      <RoutineDialogs dialog={dialog} state={state} byId={byId} preselectedStudentId={params.get('alumno')} on={on} />
    </section>
  );
}
