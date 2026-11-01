import { useState } from 'react';
import { FOCUS_RING } from '@/components/shared/layout/compact';
import Card from '@/components/shared/ui/Card';
import { useNow } from '@/hooks/shared/useNow';
import { formatClock } from '@/utils/sessions/workoutFormat';
import { restRemaining, restTotal } from '@/utils/workout/workoutState';

const MINUS = '−';
const PILL = `h-11 cursor-pointer rounded-pill bg-ink3 px-4 font-mono text-[11px] text-bone0 transition-colors hover:bg-ink4 ${FOCUS_RING}`;

// Cuándo se registró la última serie (el descanso arranca en ese mismo instante); 0 si no hay o no se puede leer.
const lastSetTime = (workout) => {
  const time = Date.parse(workout.sets.at(-1)?.executedAt);
  return Number.isNaN(time) ? 0 : time;
};

/**
 * El descanso después de registrar una serie: cuenta regresiva (contra la hora de fin guardada en la sesión, así
 * recargar no la corre), +15″, −15″ y Saltar. Al llegar a 0 anuncia "¡A la próxima serie!". Sin descanso, nada.
 * El reloj no se anuncia segundo a segundo: solo lo lee el lector de pantalla al terminar. La barra es contra el total
 * guardado al arrancar el descanso (y movido por ±15″), no contra el ejercicio que esté a la vista.
 *
 * `useNow` se renueva una vez por segundo, así que justo después de una acción tiene hasta un segundo de atraso y el
 * resto saldría de más (1:31 en vez de 1:30). Por eso se cuenta desde el más tardío entre ese reloj, la última serie
 * registrada (el motor arranca el descanso con su hora) y la última vez que se tocó +15″, −15″ o Saltar acá. Así el
 * valor es exacto al instante y no hace falta volver a montar el descanso (se perdería el foco del botón apretado).
 */
export default function RestTimer({ workout, onAdjust, onSkip }) {
  const now = useNow();
  const [actedAt, setActedAt] = useState(0);
  const remaining = restRemaining(workout, new Date(Math.max(now.getTime(), actedAt, lastSetTime(workout))));
  if (remaining === null) return null;
  const total = restTotal(workout);
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;
  // La hora se anota después de la acción, que ya fijó la suya: nunca es anterior a la del motor.
  const acting = (action) => () => {
    action();
    setActedAt(Date.now());
  };
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
          <button type="button" aria-label="+15 segundos" onClick={acting(() => onAdjust(15))} className={PILL}>
            +15″
          </button>
          <button type="button" aria-label={`${MINUS}15 segundos`} onClick={acting(() => onAdjust(-15))} className={PILL}>
            {MINUS}15″
          </button>
          <button type="button" aria-label="Saltar descanso" onClick={acting(onSkip)} className={PILL}>
            Saltar
          </button>
        </div>
      </div>
    </Card>
  );
}
