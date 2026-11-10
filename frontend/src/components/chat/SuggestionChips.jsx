import { useId, useState } from 'react';
import { useApplySuggestion } from '@/hooks/chat/useApplySuggestion';
import ApplySuggestion from './ApplySuggestion';

const CHIP = [
  'cursor-pointer rounded-pill border px-3 py-1.5 font-mono text-[10px] tracking-[0.3px] transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accentText',
].join(' ');
const OPEN = 'border-accent/40 bg-accent/15 text-bone0';
const CLOSED = 'border-white/[0.12] bg-white/[0.06] text-bone0 hover:bg-white/[0.1]';

/**
 * Los ejercicios que sugiere el asistente en la respuesta `message`, como chips con el nombre. Tocar uno muestra el
 * porqué (y esconde el de otro); tocarlo de nuevo lo esconde. Debajo del porqué va "Aplicar" (`ApplySuggestion`) si la
 * consulta era sobre el ejercicio a la vista de la sesión en curso de hoy; si no, son solo informativos.
 */
export default function SuggestionChips({ message, suggestions }) {
  const [openId, setOpenId] = useState(null);
  const checkOf = useApplySuggestion(message);
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
        <div id={reasonId} className="flex flex-col gap-2">
          <p className="font-body text-xs leading-[1.4] text-ink6">{open.reason}</p>
          <ApplySuggestion suggestion={open} check={checkOf(open)} />
        </div>
      )}
    </div>
  );
}
