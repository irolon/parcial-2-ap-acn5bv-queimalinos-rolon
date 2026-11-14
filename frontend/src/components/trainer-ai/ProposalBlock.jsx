import { useId } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClass } from '@/components/shared/ui/Button';
import Pill from '@/components/shared/ui/Pill';
import { profileHref } from '@/routes/routeTable';
import { DAY_OPTIONS, formatRoutineDays, sortDays } from '@/utils/students/routineDays';
import { kgText } from '@/utils/sessions/workoutFormat';
import { differsFromProposal } from '@/utils/trainer-ai/assignedBlock';

// Mismo formato visual que la tabla del editor (`ExerciseTable`), en modo lectura.
const HEAD = 'px-2 py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[1px] text-ink6';
const CELL = 'px-2 py-2.5 align-top font-body text-sm text-bone0';
const COLUMNS = ['#', 'Ejercicio', 'Series × reps', 'Descanso', 'Peso sugerido', 'Notas'];
/** `format(value)`, o una raya si no hay valor. */
const orDash = (value, format = (v) => v) => (value === null || value === undefined || value === '' ? '—' : format(value));

/** L M X J V S D como los chips del editor, marcados los del bloque (solo lectura). */
function BlockDays({ days }) {
  return (
    <div role="img" aria-label={`Días: ${formatRoutineDays(sortDays(days))}`} className="flex flex-wrap gap-1.5">
      {DAY_OPTIONS.map(({ value, short }) => (
        <span
          key={value}
          aria-hidden="true"
          className={`flex h-8 w-8 items-center justify-center rounded-full border font-display text-xs font-semibold ${
            days.includes(value) ? 'border-transparent bg-accent text-accentInk' : 'border-ink3 bg-ink1 text-ink5'
          }`}
        >
          {short}
        </span>
      ))}
    </div>
  );
}

function AssignedMark({ assigned, changed }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Pill tone="good"><Check size={12} aria-hidden="true" /> {changed ? 'Asignado · con tus cambios' : 'Asignado'}</Pill>
      <Link to={profileHref(assigned.studentId)} className="font-body text-sm text-accentText underline hover:text-bone0">
        Ver la rutina en la ficha de {assigned.studentName}
      </Link>
    </div>
  );
}

/**
 * Un bloque de la propuesta: nombre, días, tabla de ejercicios y "Editar y asignar" (o la marca "Asignado").
 * Ya asignado muestra lo que se asignó desde el editor (`assigned.block`), que puede no ser lo que propuso la IA.
 */
export default function ProposalBlock({ block: proposed, editHref, assigned }) {
  const titleId = useId();
  const block = assigned?.block ?? proposed;
  const changed = Boolean(assigned?.block) && differsFromProposal(assigned.block, proposed);
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-xl border border-ink2 bg-ink1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="font-display text-[15px] font-semibold text-bone0">{block.name}</h2>
          <BlockDays days={block.days} />
        </div>
        {assigned ? <AssignedMark assigned={assigned} changed={changed} /> : <Link to={editHref} className={buttonClass({ size: 'sm' })}>Editar y asignar</Link>}
      </div>
      <div className="overflow-x-auto rounded-xl border border-ink2">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr>{COLUMNS.map((label) => <th key={label} scope="col" className={HEAD}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {block.exercises.map((item, index) => (
              <tr key={`${item.exercise_id}-${index}`} className="border-t border-ink2 bg-ink0">
                <td className="px-2 py-2.5 align-top font-mono text-xs text-ink6">{index + 1}</td>
                <td className={CELL}>{item.exercise_name ?? 'Ejercicio'}</td>
                <td className={CELL}>{`${item.sets} × ${item.reps}`}</td>
                <td className={CELL}>{orDash(item.rest_seconds, (v) => `${v} s`)}</td>
                <td className={CELL}>{orDash(item.suggested_kg, (v) => `${kgText(v)} kg`)}</td>
                <td className={`${CELL} max-w-56 text-ink6`}>{orDash(item.notes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
