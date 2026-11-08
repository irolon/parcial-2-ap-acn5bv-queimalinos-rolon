import Select from '@/components/shared/ui/Select';
import { SLOT_COLORS } from '@/utils/progress/compare';

const EMPTY = { value: '', label: 'Elegí un ejercicio' };

function optionLabel(exercise, { bodyweight, maxOnly }) {
  if (bodyweight.has(exercise.id)) return `${exercise.name} (sin peso registrado)`;
  if (maxOnly.has(exercise.id)) return `${exercise.name} (peso máx.)`;
  return exercise.name;
}

/**
 * Un selector por línea, con el punto de su color. Ofrece los ejercicios candidatos sin los elegidos en los otros;
 * los de peso corporal ya detectados van deshabilitados. `maxOnly`: los que se grafican con el peso máximo.
 */
export default function CompareSlots({ slots, options, bodyweight, maxOnly, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {slots.map((id, i) => {
        const others = slots.filter((s, j) => j !== i && s);
        const choices = options
          .filter((e) => !others.includes(e.id))
          .map((e) => ({ value: e.id, label: optionLabel(e, { bodyweight, maxOnly }), disabled: bodyweight.has(e.id) }));
        const label = (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: SLOT_COLORS[i] }} />
            Ejercicio {i + 1}
          </span>
        );
        return (
          <Select
            key={SLOT_COLORS[i]}
            label={label}
            options={[EMPTY, ...choices]}
            value={id ?? ''}
            onChange={(e) => onChange(i, e.target.value)}
          />
        );
      })}
    </div>
  );
}
