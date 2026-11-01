import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Play } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import DiscardWorkoutDialog from '@/components/student/DiscardWorkoutDialog';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';
import { WORKOUT_PATH } from '@/routes/routeTable';

/**
 * Cómo se entra a la sesión de entrenamiento desde Hoy y desde una rutina.
 * - Sin sesión abierta, el botón la empieza con `routine` (`startLabel`) y entra.
 * - Con una abierta, de esta u otra rutina, el botón dice `continueLabel` y entra a esa sin pisarla; se la puede
 *   descartar, con confirmación. Una sesión terminada (sube o espera subir) no se descarta desde acá.
 */
export default function WorkoutEntry({ routine, startLabel, continueLabel, size = 'lg' }) {
  const studentId = useAuthStore((state) => state.user?.id);
  const navigate = useNavigate();
  const { workout, start, discard } = useActiveWorkout(studentId);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasExercises = (routine?.exercises ?? []).length > 0;
  const canDiscard = Boolean(workout) && workout.finishedAt == null;

  function enter() {
    setFailed(false);
    if (!workout && !start(routine)) {
      setFailed(true);
      return;
    }
    navigate(WORKOUT_PATH);
  }

  function confirmDiscard() {
    discard();
    setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size={size} className="whitespace-nowrap" disabled={!workout && !hasExercises} onClick={enter}>
          <Play size={18} aria-hidden="true" />
          {workout ? continueLabel : startLabel}
        </Button>
        {canDiscard && (
          <Button variant="ghost" size={size} className="whitespace-nowrap" onClick={() => setConfirming(true)}>
            Descartar
          </Button>
        )}
      </div>
      {workout && <p className="font-body text-sm text-ink6">En curso: {workout.routineName}</p>}
      {!workout && !hasExercises && (
        <p className="font-body text-sm text-ink6">Esta rutina todavía no tiene ejercicios.</p>
      )}
      {failed && (
        <p role="alert" className="font-body text-sm text-hot">
          No pudimos empezar el entrenamiento. Probá de nuevo más tarde.
        </p>
      )}
      <DiscardWorkoutDialog open={confirming} onCancel={() => setConfirming(false)} onConfirm={confirmDiscard} />
    </div>
  );
}
