/** Selector segmentado de métrica; las opciones `disabled` no se pueden elegir. */
export default function MetricSelector({ value, options, onChange }) {
  return (
    <div role="group" aria-label="Métrica" className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={o.disabled}
            title={o.disabled ? 'Sin peso registrado' : undefined}
            onClick={() => onChange(o.value)}
            className={`rounded-pill border px-2.5 py-1 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'border-transparent bg-accent text-accentInk' : 'border-white/[0.12] text-bone2 hover:text-bone0'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
