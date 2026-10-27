import { useId } from 'react';
import ExerciseThumb from '@/components/exercises/ExerciseThumb';
import RowMenu from './RowMenu';
import { muscleLabel } from '@/utils/exercises/exerciseOptions';

export const FIELDS = [
  { field: 'sets', label: 'Series', width: 'w-16', numeric: true },
  { field: 'reps', label: 'Reps', width: 'w-16', numeric: true },
  { field: 'rest_seconds', label: 'Descanso (s)', width: 'w-20', numeric: true },
  { field: 'suggested_kg', label: 'Peso (kg)', width: 'w-20', numeric: true },
  { field: 'tempo', label: 'Tempo', width: 'w-24' },
  { field: 'notes', label: 'Nota', width: 'w-44' },
];

function Cell({ item, name, value, error, width, numeric, label, field, onChange }) {
  const errorId = `${useId()}-error`;
  const invalid = Boolean(error);
  return (
    <td className="px-1.5 py-2 align-top">
      <input
        aria-label={`${label} de ${name}`}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={invalid ? errorId : undefined}
        inputMode={numeric ? 'decimal' : undefined}
        value={value}
        onChange={(event) => onChange(item.key, field, event.target.value)}
        className={`h-9 rounded-md border bg-ink1 px-2 font-body text-sm text-bone0 outline-none focus:border-accentText ${width} ${
          invalid ? 'border-hot' : 'border-ink3'
        }`}
      />
      {invalid && <p id={errorId} className={`mt-1 font-mono text-[10px] text-hot ${width}`}>{error}</p>}
    </td>
  );
}

/** Fila de la tabla: `#`, asa (opcional), ejercicio, campos editables y menú. `exercise` puede faltar si salió de la biblioteca. */
export default function ExerciseRow({ item, index, last, exercise, errors = {}, onChange, onMove, onRemove, handle, rowRef, style, dragging }) {
  const name = exercise?.name ?? 'Ejercicio';
  return (
    <tr ref={rowRef} style={style} className={`border-t border-ink2 ${dragging ? 'bg-ink2 shadow-lg' : 'bg-ink0'}`}>
      <td className="px-2 py-2 align-top font-mono text-xs text-ink6">{index + 1}</td>
      <td className="px-1 py-1.5 align-top">{handle}</td>
      <td className="px-2 py-2 align-top">
        <div className="flex min-w-44 items-center gap-2.5">
          <div className="w-9 shrink-0">
            <ExerciseThumb url={exercise?.video_url} />
          </div>
          <div className="min-w-0">
            <p className="font-body text-sm text-bone0">{name}</p>
            {exercise && <p className="font-mono text-[10px] uppercase text-ink6">{muscleLabel(exercise.muscle_group)}</p>}
          </div>
        </div>
      </td>
      {FIELDS.map((spec) => (
        <Cell key={spec.field} item={item} name={name} value={item[spec.field]} error={errors[spec.field]} onChange={onChange} {...spec} />
      ))}
      <td className="px-1.5 py-2 align-top">
        <RowMenu name={name} isFirst={index === 0} isLast={last} onMove={(delta) => onMove(item.key, delta)} onRemove={() => onRemove(item.key)} />
      </td>
    </tr>
  );
}
