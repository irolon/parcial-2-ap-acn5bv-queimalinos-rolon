import { useId } from 'react';

/**
 * Interruptor accesible: un `<button role="switch">` con `aria-checked`. El `label` es su nombre (y al tocarlo también
 * lo cambia) y el `detail`, su descripción. Click, espacio o Enter llaman `onChange(!checked)`; `disabled` no.
 */
export default function Switch({ id, checked, onChange, label, detail, disabled = false }) {
  const generated = useId();
  const switchId = id ?? generated;
  const detailId = detail ? `${switchId}-detail` : undefined;
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={switchId} className="block font-display text-[13px] font-medium text-bone0">
          {label}
        </label>
        {detail && (
          <p id={detailId} className="mt-0.5 font-body text-[12px] text-ink6">
            {detail}
          </p>
        )}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={detailId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-accent' : 'bg-ink3',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'inline-block h-5 w-5 rounded-full bg-bone0 shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
