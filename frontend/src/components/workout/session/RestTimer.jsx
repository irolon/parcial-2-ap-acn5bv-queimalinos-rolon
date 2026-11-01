import { FOCUS_RING } from '@/components/shared/layout/compact';
import Card from '@/components/shared/ui/Card';
import { useNow } from '@/hooks/shared/useNow';
import { formatClock } from '@/utils/sessions/workoutFormat';
import { restRemaining } from '@/utils/workout/workoutState';

const MINUS = '−';
const PILL = `h-11 cursor-pointer rounded-pill bg-ink3 px-4 font-mono text-[11px] text-bone0 transition-colors hover:bg-ink4 ${FOCUS_RING}`;

/**
 * El descanso después de registrar una serie: cuenta regresiva (contra la hora de fin guardada en la sesión, así
 * recargar no la corre), +15″, −15″ y Saltar. Al llegar a 0 anuncia "¡A la próxima serie!". Sin descanso, nada.
 * El reloj no se anuncia segundo a segundo: solo lo lee el lector de pantalla al terminar.
 */
export default function RestTimer({ workout, onAdjust, onSkip }) {
  const now = useNow();
  const remaining = restRemaining(workout, now);
  if (remaining === null) return null;
  const total = workout.exercises[workout.cursor]?.restSeconds ?? 0;
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;
  return (
    <Card>
      <div className="text-center">
        <p className="font-mono text-[10px] tracking-[2px] text-accentText">DESCANSO</p>
        <div
          role="timer"
          aria-live="off"
          aria-label="Tiempo de descanso"
          className="font-display text-[46px] font-bold leading-[1.1] tracking-[-2px] text-bone0"
        >
          {formatClock(remaining)}
        </div>
        <div aria-hidden="true" className="my-3 h-[5px] overflow-hidden rounded-[3px] bg-ink3">
          <div
            data-testid="rest-progress"
            className="h-full bg-accent transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p role="status" aria-live="polite" className="mb-3 min-h-5 font-display text-sm font-semibold text-good">
          {remaining === 0 ? '¡A la próxima serie!' : ''}
        </p>
        <div className="flex justify-center gap-2">
          <button type="button" aria-label="+15 segundos" onClick={() => onAdjust(15)} className={PILL}>
            +15″
          </button>
          <button type="button" aria-label={`${MINUS}15 segundos`} onClick={() => onAdjust(-15)} className={PILL}>
            {MINUS}15″
          </button>
          <button type="button" onClick={onSkip} className={PILL}>
            Saltar
          </button>
        </div>
      </div>
    </Card>
  );
}
