import { useId } from 'react';
import { X } from 'lucide-react';
import { FOCUS_RING } from '@/components/shared/layout/compact';
import Card from '@/components/shared/ui/Card';
import { kgLabel } from '@/utils/sessions/workoutFormat';
import { exerciseSets } from '@/utils/workout/workoutState';

const HEAD = 'pb-2 text-left font-mono text-[9px] font-normal uppercase tracking-[1px] text-ink6';
const CELL = 'py-3 pr-2 font-display text-base font-semibold text-bone0';

// Las series del plan que faltan, apagadas y sin leer (la que sigue lleva un punto).
function PendingRow({ number, isNext }) {
  return (
    <tr aria-hidden="true" className="border-b border-ink2 opacity-45">
      <td className={`${CELL} text-[13px] text-ink6`}>{number}</td>
      <td className={CELL}>—</td>
      <td className={CELL}>—</td>
      <td className="py-3 text-right text-ink5">{isNext ? '●' : ''}</td>
    </tr>
  );
}

/** La tabla "Series" del ejercicio a la vista: #, peso y reps de lo registrado, con ✕ para borrar cada serie. */
export default function SetsTable({ workout, onDelete }) {
  const headingId = useId();
  const exercise = workout.exercises[workout.cursor];
  const sets = exerciseSets(workout);
  const pending = Math.max(0, exercise.sets - sets.length);
  return (
    <Card className="min-w-0">
      <h3 id={headingId} className="mb-3.5 font-display text-[15px] font-semibold text-bone0">
        Series
      </h3>
      <table aria-labelledby={headingId} className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ink2">
            <th scope="col" className={`${HEAD} w-8`}>#</th>
            <th scope="col" className={HEAD}>Peso</th>
            <th scope="col" className={HEAD}>Reps</th>
            <th scope="col" className={`${HEAD} w-11`}>
              <span className="sr-only">Borrar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sets.map((set) => (
            <tr key={set.id} className="border-b border-ink2">
              <td className={`${CELL} text-[13px] text-accentText`}>{set.setNumber}</td>
              <td className={CELL}>{kgLabel(set.kg)}</td>
              <td className={CELL}>{set.reps}</td>
              <td className="py-1 text-right">
                <button
                  type="button"
                  aria-label={`Borrar la serie ${set.setNumber}`}
                  onClick={() => onDelete(set)}
                  className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-ink6 hover:text-hot ${FOCUS_RING}`}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
          {Array.from({ length: pending }, (_, i) => (
            <PendingRow key={`pending-${sets.length + i}`} number={sets.length + i + 1} isNext={i === 0} />
          ))}
        </tbody>
      </table>
      {sets.length === 0 && (
        <p className="mt-3 font-body text-sm text-ink6">Todavía no registraste series de este ejercicio.</p>
      )}
    </Card>
  );
}
