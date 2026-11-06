import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import AiError from '@/components/trainer-ai/AiError';
import AiProposal from '@/components/trainer-ai/AiProposal';
import AiRoutineForm from '@/components/trainer-ai/AiRoutineForm';
import AiWaiting from '@/components/trainer-ai/AiWaiting';
import LoadingState from '@/components/shared/states/LoadingState';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useStudentQuery } from '@/hooks/students/useStudents';
import { useAiSession } from '@/hooks/trainer-ai/useAiSession';
import { useGenerateRoutine } from '@/hooks/trainer-ai/useGenerateRoutine';
import { AI_ROUTINE, newRoutineHref } from '@/routes/routeTable';
import { aiErrorOf } from '@/utils/trainer-ai/aiErrors';
import { DEFAULT_FORM, buildGenerateBody, formFromStudent } from '@/utils/trainer-ai/aiForm';

const STUDENT_GONE = { fields: { studentId: 'Ese alumno no está activo o no existe' } };

/** Formulario de la entrada desde la ficha (`?alumno=`): precargado con la ficha, o sin alumno si no se encontró. */
function useEntryForm(studentId) {
  const query = useStudentQuery(studentId);
  if (!studentId) return null;
  if (query.isPending) return { loading: true };
  if (query.isError) return { form: DEFAULT_FORM, student: null, errors: STUDENT_GONE };
  return { form: formFromStudent(query.data), student: { id: query.data.id, name: query.data.name } };
}

/**
 * Asistente IA del entrenador: formulario → esperando → propuesta (más el error, siempre con salida).
 * La propuesta vive en `sessionStorage` (ver `useAiSession`); con `?alumno=` se arranca con el formulario precargado.
 */
export default function AiRoutinePage() {
  const trainerId = useAuthStore((s) => s.user?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const entryId = params.get('alumno');
  const entry = useEntryForm(entryId);
  const [session, setSession] = useAiSession(trainerId);
  const seq = useRef(0);
  const busy = useRef(false);
  const { generate, cancel } = useGenerateRoutine();
  const [view, setView] = useState(() => ({ phase: !entryId && session?.proposal ? 'proposal' : 'form', id: 0 }));
  const show = (next) => setView({ ...next, id: ++seq.current });

  async function run(form, student) {
    if (busy.current) return;
    busy.current = true;
    show({ phase: 'waiting', startedAt: new Date(), form, student });
    const result = await generate(buildGenerateBody(form));
    busy.current = false;
    if (result.aborted) return;
    if (result.error) {
      const error = aiErrorOf(result.error);
      show(error.kind === 'fields' ? { phase: 'form', form, student, errors: error } : { phase: 'error', form, student, error });
      return;
    }
    setSession({
      form, student, generationId: result.data.generation_id, proposal: result.data.routine_proposal, assigned: {}, saved: null, editing: null,
    });
    show({ phase: 'proposal' });
    if (entryId) navigate(AI_ROUTINE.path, { replace: true });
  }

  const handleCancel = () => {
    cancel();
    show({ phase: 'form', form: view.form, student: view.student });
  };

  if (view.phase === 'waiting') return <AiWaiting startedAt={view.startedAt} onCancel={handleCancel} />;
  if (view.phase === 'error') {
    return <AiError key={view.id} error={view.error} manualHref={newRoutineHref(view.student?.id)} onRetry={() => run(view.form, view.student)} />;
  }
  if (view.phase === 'proposal' && session?.proposal) {
    return (
      <AiProposal
        session={session}
        manualHref={newRoutineHref(session.student?.id)}
        onSaved={(saved) => setSession((s) => ({ ...s, saved }))}
        onAgain={() => show({ phase: 'form', form: session.form, student: session.student })}
      />
    );
  }
  if (!view.form && entry?.loading) return <LoadingState rows={4} label="Cargando los datos del alumno…" />;
  const start = view.form ? view : (entry ?? { form: session?.form ?? DEFAULT_FORM, student: session?.student ?? null });
  return (
    <AiRoutineForm
      key={view.id}
      initial={start.form}
      student={start.student}
      errors={view.form ? view.errors : entry?.errors}
      onSubmit={run}
    />
  );
}
