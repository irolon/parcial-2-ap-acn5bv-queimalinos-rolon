import { useId } from 'react';

/** Select con el mismo estilo que `Input`. `options`: `[{ value, label, disabled? }]`. */
export default function Select({ label, options, error, hint, id, className = '', ...rest }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label
        htmlFor={selectId}
        className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6"
      >
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`h-[46px] w-full rounded-md border bg-ink1 px-3.5 font-body text-sm text-bone0 outline-none focus:border-accentText ${
          error ? 'border-hot' : 'border-ink3'
        }`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="mt-1.5 font-mono text-[10px] text-ink6">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 font-mono text-[11px] text-hot">
          {error}
        </p>
      )}
    </div>
  );
}
