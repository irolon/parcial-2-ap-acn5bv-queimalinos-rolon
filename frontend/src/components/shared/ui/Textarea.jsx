import { useId } from 'react';

/** Área de texto con el mismo contrato y estilo que `Input`. */
export default function Textarea({ label, error, hint, id, className = '', ...rest }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`min-h-24 w-full resize-y rounded-md border bg-ink1 px-3.5 py-3 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText ${
          error ? 'border-hot' : 'border-ink3'
        }`}
        {...rest}
      />
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
