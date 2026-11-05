import { useId } from 'react';
import { FOCUS_RING } from '@/components/shared/layout/compact';

const STEP_BUTTON = `flex h-11 min-w-12 cursor-pointer items-center justify-center rounded-md bg-ink3 px-3 font-mono text-xs font-semibold
  text-bone0 transition-colors hover:bg-ink4 ${FOCUS_RING}`;

/**
 * Un campo grande de la serie (peso o reps): el número editable, su unidad y los botones de paso.
 * `steps` es `[{ text, label, onClick }]`: el texto del botón ("−2,5") y su nombre accesible ("−2,5 kg").
 */
export default function LoadField({
  label, ariaLabel, unit, value, placeholder, inputMode, error, onChange, onBlur, steps,
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div
      className={`min-w-0 flex-1 rounded-xl border bg-ink2 px-2 pb-3 pt-3 text-center sm:px-3 sm:pb-4 sm:pt-4 ${error ? 'border-hot' : 'border-ink3'}`}
    >
      <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[1.5px] text-ink6">
        <label htmlFor={id}>{label}</label>
        <span aria-hidden="true">{unit}</span>
      </div>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={(event) => event.target.select()}
        className="h-14 w-full min-w-0 rounded-md bg-transparent text-center font-display text-4xl font-bold leading-none sm:h-[72px]
          tracking-[-2px] text-bone0 outline-none placeholder:font-body placeholder:text-base placeholder:font-normal
          placeholder:tracking-normal placeholder:text-ink6 focus-visible:ring-2 focus-visible:ring-accentText sm:text-[64px]"
      />
      <div className="mt-3 flex justify-center gap-1.5 sm:gap-2">
        {steps.map((step) => (
          <button key={step.label} type="button" aria-label={step.label} onClick={step.onClick} className={STEP_BUTTON}>
            {step.text}
          </button>
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-3 font-mono text-[11px] text-hot">
          {error}
        </p>
      )}
    </div>
  );
}
