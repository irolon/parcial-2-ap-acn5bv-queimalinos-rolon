import { useId } from 'react';

export default function Input({ label, error, id, className = '', ...rest }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.8px] text-ink6"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-[46px] w-full rounded-lg border bg-ink2 px-3.5 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText ${
          error ? 'border-hot' : 'border-ink4'
        }`}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 font-mono text-[11px] text-hot">
          {error}
        </p>
      )}
    </div>
  );
}
