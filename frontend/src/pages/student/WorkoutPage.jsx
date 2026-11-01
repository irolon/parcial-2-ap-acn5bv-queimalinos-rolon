import { Navigate } from 'react-router';
import FeedbackForm from '@/components/workout/feedback/FeedbackForm';
import SavingScreen from '@/components/workout/result/SavingScreen';
import WorkoutSummary from '@/components/workout/result/WorkoutSummary';
import ActiveSession from '@/components/workout/session/ActiveSession';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { usePageHeader } from '@/hooks/shared/usePageHeader';
import { useWorkoutSave } from '@/hooks/workout/useWorkoutSave';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';
import { ROLES, homeFor } from '@/routes/routeTable';

// Terminada y con el feedback decidido (o salteado): lo único que falta es subirla.
const isReadyToUpload = (workout) => Boolean(workout?.finishedAt) && workout.feedback !== null;

// Qué pantalla toca. Mientras se guarda o ya se guardó (hay resumen para mostrar) manda la subida: `upload()` borra la
// sesión en cuanto sale bien, y ese instante no es "no hay sesión". Sin eso, sin sesión es volver a Hoy: también si el
// alumno descartó lo que no se pudo guardar. Lista para subir sin que esta página la haya subido (`idle` sin error) es
// que la terminó otra pestaña, que la está subiendo: se ve "Guardando…", no un error.
function screenFor(save, workout) {
  if (save.status === 'saved') return 'summary';
  if (save.status === 'saving') return 'saving';
  if (!workout) return 'gone';
  if (save.status === 'failed') return 'failed';
  if (!workout.finishedAt) return 'training';
  return workout.feedback === null ? 'feedback' : 'saving';
}

function headerFor(screen, workout) {
  if (screen === 'training') {
    return { title: workout.routineName ? `Entrenando · ${workout.routineName}` : 'Entrenando', subtitle: 'SESIÓN EN CURSO' };
  }
  return screen === 'summary' ? { title: 'Entrenamiento', subtitle: 'RESUMEN' } : null;
}

/**
 * La sesión activa del alumno (`/alumno/entrenar`), según el estado de la sesión guardada en el navegador:
 * - sin sesión (y sin resumen para mostrar): vuelve a Hoy;
 * - en curso: la pantalla de entrenamiento;
 * - terminada y sin feedback: "¿Qué tan dura fue?" (Guardar o Saltar y sube);
 * - terminada con el feedback decidido (se recargó entre Terminar y la subida): sube sola, con Reintentar y Descartar
 *   si falla (o solo Descartar entrenamiento si el servidor la rechaza para siempre). Si la terminó otra pestaña,
 *   esta muestra "Guardando…" mientras la otra la sube;
 * - guardada: el resumen, que se queda en esta página.
 */
export default function WorkoutPage() {
  const studentId = useAuthStore((state) => state.user?.id);
  const active = useActiveWorkout(studentId);
  const { workout, setFeedback } = active;
  const save = useWorkoutSave(active.upload, isReadyToUpload(workout));
  const screen = screenFor(save, workout);
  usePageHeader(headerFor(screen, workout));

  const sendFeedback = (feedback) => {
    setFeedback(feedback);
    save.run();
  };

  switch (screen) {
    case 'summary':
      return <WorkoutSummary result={save.result} />;
    case 'saving':
      return <SavingScreen saving error={null} onRetry={save.run} />;
    case 'failed':
      return <SavingScreen saving={false} error={save.error} onRetry={save.run} onDiscard={active.discard} />;
    case 'training':
      return <ActiveSession {...active} />;
    case 'feedback':
      return <FeedbackForm onSave={sendFeedback} onSkip={() => sendFeedback({})} />;
    default:
      return <Navigate to={homeFor(ROLES.STUDENT)} replace />;
  }
}
