import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import AiError from '@/components/trainer-ai/AiError';
import AiProposal from '@/components/trainer-ai/AiProposal';
import AiRoutineForm from '@/components/trainer-ai/AiRoutineForm';
import AiWaiting from '@/components/trainer-ai/AiWaiting';
import { UnfinishedProposal } from '@/components/trainer-ai/FormNotices';
import LoadingState from '@/components/shared/states/LoadingState';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useAiSession } from '@/hooks/trainer-ai/useAiSession';
import { useEntryForm } from '@/hooks/trainer-ai/useEntryForm';
import { useGenerateRoutine } from '@/hooks/trainer-ai/useGenerateRoutine';
import { AI_ROUTINE, newRoutineHref } from '@/routes/routeTable';
import { aiErrorOf } from '@/utils/trainer-ai/aiErrors';
import { DEFAULT_FORM, buildGenerateBody } from '@/utils/trainer-ai/aiForm';

/**
 * Asistente IA del entrenador: formulario → esperando → propuesta (más el error, siempre con salida).
 * La propuesta vive en `sessionStorage` (ver `useAiSession`). Las entradas (`?alumno=` desde la ficha, precargado, o
 * `?nueva=1` desde Rutinas) abren siempre el formulario, con "Verla" si hay una propuesta sin terminar; sin marca de
 * entrada (la vuelta del editor) se muestra la propuesta guardada.
 */
export default function AiRoutinePage() {
  const trainerId = useAuthStore((s) => s.user?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const entryId = params.get('alumno');
  const isEntry = Boolean(entryId) || params.get('nueva') === '1';
  const fetched = useEntryForm(entryId);
  // La entrada se fija la primera vez que la ficha responde: el "Reintentar" del formulario vuelve a pedir la misma
  // query (que pasa a `loading`) y la página no debe desmontar el formulario con lo que el PT ya escribió.
  const [settled, setSettled] = useState(null);
  if (fetched && fetched.status !== 'loading' && settled?.id !== entryId) setSettled({ id: entryId, entry: fetched });
  const entry = settled?.id === entryId ? settled.entry : fetched;
  const [session, setSession] = useAiSession(trainerId);
  const seq = useRef(0);
  const busy = useRef(false);
  const { generate, cancel } = useGenerateRoutine();
  const [view, setView] = useState(() => ({ phase: !isEntry && session?.proposal ? 'proposal' : 'form', id: 0 }));
  const show = (next) => setView({ ...next, id: ++seq.current });
  // Ya en la propuesta, la URL queda sin la marca de entrada: una recarga la sigue mostrando.
  const showProposal = () => {
    show({ phase: 'proposal' });
    if (isEntry) navigate(AI_ROUTINE.path, { replace: true });
  };

  async function run(form, student, options) {
    if (busy.current) return;
    busy.current = true;
    show({ phase: 'waiting', startedAt: new Date(), form, student, options });
    const result = await generate(buildGenerateBody(form, options));
    busy.current = false;
    if (result.aborted) return;
    if (result.error) {
      const error = aiErrorOf(result.error);
      show(error.kind === 'fields' ? { phase: 'form', form, student, errors: error } : { phase: 'error', form, student, options, error });
      return;
    }
    setSession({
      form, student, generationId: result.data.generation_id, proposal: result.data.routine_proposal, assigned: {}, saved: null,
    });
    showProposal();
  }

  const handleCancel = () => {
    cancel();
    show({ phase: 'form', form: view.form, student: view.student });
  };

  if (view.phase === 'waiting') return <AiWaiting startedAt={view.startedAt} hasStudent={Boolean(view.student)} onCancel={handleCancel} />;
  if (view.phase === 'error') {
    return <AiError key={view.id} error={view.error} manualHref={newRoutineHref(view.student?.id)} onRetry={() => run(view.form, view.student, view.options)} />;
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
  if (!view.form && entry?.status === 'loading') return <LoadingState rows={4} label="Cargando los datos del alumno…" />;
  const fallback = isEntry ? { form: DEFAULT_FORM, student: null } : { form: session?.form ?? DEFAULT_FORM, student: session?.student ?? null };
  const start = view.form ? view : (entry ?? fallback);
  return (
    <div className="flex flex-col gap-4">
      {isEntry && session?.proposal && <UnfinishedProposal onShow={showProposal} />}
      <AiRoutineForm
        key={view.id}
        initial={start.form}
        student={start.student}
        pendingStudentId={!view.form && entry?.status === 'failed' ? entryId : null}
        errors={view.form ? view.errors : entry?.errors}
        onSubmit={run}
      />
    </div>
  );
}
