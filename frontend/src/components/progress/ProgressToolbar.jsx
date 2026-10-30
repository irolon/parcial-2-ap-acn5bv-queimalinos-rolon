import Select from '@/components/shared/ui/Select';
import { RANGES } from '@/utils/progress/ranges';

/** Selector de ejercicio (todo el historial) y de rango (1 mes, 3 meses, todo). */
export default function ProgressToolbar({ exercises, exerciseId, onExercise, range, onRange }) {
  const options = exercises.map((e) => ({ value: e.id, label: e.name }));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Select label="Ejercicio" options={options} value={exerciseId} onChange={(e) => onExercise(e.target.value)} />
      <Select label="Rango" options={RANGES} value={range} onChange={(e) => onRange(e.target.value)} />
    </div>
  );
}
