import ExerciseRow, { FIELDS } from './ExerciseRow';

const HEAD = 'px-2 py-2 text-left font-mono text-[9px] font-normal uppercase tracking-[1px] text-ink6';

/** Tabla editable de la rutina. `errors` es `exercises` de `validateRoutine` (por `key`). */
export default function ExerciseTable({ exercises, byId, errors = {}, onChange, onMove, onRemove }) {
  if (exercises.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-ink3 px-4 py-10 text-center font-body text-sm text-ink6">
        Agregá ejercicios desde la biblioteca
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-ink2">
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr>
            <th scope="col" className={HEAD}>#</th>
            <th scope="col" className={HEAD}>Ejercicio</th>
            {FIELDS.map(({ field, label }) => (
              <th key={field} scope="col" className={HEAD}>{label}</th>
            ))}
            <th scope="col" className={HEAD}><span className="sr-only">Opciones</span></th>
          </tr>
        </thead>
        <tbody>
          {exercises.map((item, index) => (
            <ExerciseRow
              key={item.key}
              item={item}
              index={index}
              last={index === exercises.length - 1}
              exercise={byId.get(item.exercise_id)}
              errors={errors[item.key]}
              onChange={onChange}
              onMove={onMove}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
