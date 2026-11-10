import { useId, useState } from 'react';

const CHIP = [
  'cursor-pointer rounded-pill border px-3 py-1.5 font-mono text-[10px] tracking-[0.3px] transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
].join(' ');
const OPEN = 'border-accent/40 bg-accent/15 text-bone0';
const CLOSED = 'border-white/[0.12] bg-white/[0.06] text-bone0 hover:bg-white/[0.1]';

/**
 * Los ejercicios que sugiere el asistente, como chips con el nombre. Tocar uno muestra el porqué (y esconde el de otro);
 * tocarlo de nuevo lo esconde. Son solo informativos: no cambian la sesión.
 */
export default function SuggestionChips({ suggestions }) {
  const [openId, setOpenId] = useState(null);
  const reasonId = useId();
  const open = suggestions.find((item) => item.exercise_id === openId);
  return (
    <div className="mt-2 flex flex-col gap-2">
      <ul aria-label="Ejercicios sugeridos" className="flex flex-wrap gap-1.5">
        {suggestions.map((item) => {
          const expanded = item.exercise_id === openId;
          return (
            <li key={item.exercise_id}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={expanded ? reasonId : undefined}
                onClick={() => setOpenId(expanded ? null : item.exercise_id)}
                className={`${CHIP} ${expanded ? OPEN : CLOSED}`}
              >
                {item.name}
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <p id={reasonId} className="font-body text-xs leading-[1.4] text-ink6">
          {open.reason}
        </p>
      )}
    </div>
  );
}
