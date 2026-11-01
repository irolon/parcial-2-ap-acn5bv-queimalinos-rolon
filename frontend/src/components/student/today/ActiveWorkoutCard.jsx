import Card from '@/components/shared/ui/Card';
import WorkoutEntry from '@/components/student/WorkoutEntry';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';

/**
 * El entrenamiento en curso cuando Hoy no muestra su rutina (día de descanso, sin rutina, cargando o con error):
 * igual tiene que haber cómo volver, aunque sea de otra rutina o de otro día. Sin sesión abierta no muestra nada.
 */
export default function ActiveWorkoutCard() {
  const studentId = useAuthStore((state) => state.user?.id);
  const { workout } = useActiveWorkout(studentId);
  if (!workout) return null;
  return (
    <Card title="Entrenamiento en curso">
      <p className="mb-4 font-body text-sm text-ink6">Tenés un entrenamiento sin terminar.</p>
      <WorkoutEntry routine={null} startLabel="Empezar entrenamiento" continueLabel="Continuar entrenamiento" size="md" />
    </Card>
  );
}
