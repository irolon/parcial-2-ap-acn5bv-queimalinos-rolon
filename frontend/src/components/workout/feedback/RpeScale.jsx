import { RPE_VALUES, rpeLabel } from '@/utils/sessions/rpe';

/**
 * Los diez valores del RPE como un grupo de radios (el lector de pantalla dice cuál está elegido y las flechas
 * pasan de uno a otro). Tocar el elegido lo desmarca, como en el celular. `labelledBy` es el id de la pregunta. Cada valor
 * lleva su etiqueta ("Difícil, te quedaban 2-3 reps") como descripción y tooltip.
 */
export default function RpeScale({ value, onChange, labelledBy }) {
  return (
    <fieldset role="radiogroup" aria-labelledby={labelledBy} className="m-0 grid min-w-0 grid-cols-5 gap-2 border-0 p-0">
      {RPE_VALUES.map((rpe) => (
        <label key={rpe} className="block">
          <input
            type="radio"
            name="rpe"
            value={rpe}
            checked={value === rpe}
            aria-label={`RPE ${rpe}`}
            title={rpeLabel(rpe)}
            onChange={() => onChange(rpe)}
            onClick={() => value === rpe && onChange(null)}
            className="peer sr-only"
          />
          <span
            className="flex h-11 cursor-pointer items-center justify-center rounded-pill border border-ink4 font-display text-base
              font-semibold text-accentText transition-colors hover:bg-white/[0.06] peer-checked:border-transparent
              peer-checked:bg-accent peer-checked:text-accentInk peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2
              peer-focus-visible:outline-accentText"
          >
            {rpe}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
