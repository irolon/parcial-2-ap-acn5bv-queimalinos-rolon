import { DAY_OPTIONS } from '@/utils/students/routineDays';

/** Chips de días (L M X J V S D) con `role="checkbox"`. */
export default function DayPicker({ value, onToggle, error }) {
  return (
    <div>
      <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6">Días</span>
      <div className="flex flex-wrap gap-2">
        {DAY_OPTIONS.map(({ value: day, short, label }) => {
          const checked = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={label}
              onClick={() => onToggle(day)}
              className={`h-10 w-10 cursor-pointer rounded-full border font-display text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accentText ${
                checked ? 'border-transparent bg-accent text-accentInk' : 'border-ink3 bg-ink1 text-ink6 hover:text-bone0'
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-1.5 font-mono text-[11px] text-hot">{error}</p>}
    </div>
  );
}
