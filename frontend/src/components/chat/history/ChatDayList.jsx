import { dayLabel, dayTitle } from '@/utils/chat/chatHistory';

const ITEM = [
  'flex w-full cursor-pointer flex-col gap-1 rounded-md border-l-2 px-3 py-2.5 text-left',
  'focus-visible:outline-2 focus-visible:outline-accentText',
].join(' ');
const SELECTED = 'border-accent bg-white/[0.06]';
const IDLE = 'border-transparent hover:bg-white/[0.04]';

/**
 * "Consultas guardadas" (la columna desde `lg`): los días con consultas (`days`: `[{ date, messages }]`, hoy primero),
 * cada uno con su primera consulta (entera en `title`) y "HOY", "AYER" o "05/11". El elegido (`selected`, aaaa-mm-dd)
 * lleva el borde de acento. Sin ninguna consulta, el aviso de vacío. "Nueva consulta" y "Ver días anteriores" los pone
 * la página, que también los muestra debajo de `lg`.
 */
export default function ChatDayList({ days, selected, today, onSelect, className = '' }) {
  const withMessages = days.filter((day) => day.messages.length > 0);
  return (
    <nav aria-label="Consultas guardadas" className={`flex-col gap-3 ${className}`}>
      <h2 className="font-mono text-[10px] tracking-[1px] text-ink6">CONSULTAS GUARDADAS</h2>
      {withMessages.length === 0 && (
        <p className="font-body text-sm text-ink6">Todavía no le preguntaste nada al asistente.</p>
      )}
      <ul className="flex flex-col gap-1">
        {withMessages.map((day) => {
          const title = dayTitle(day.messages) ?? '';
          return (
            <li key={day.date}>
              <button
                type="button"
                aria-current={day.date === selected ? 'true' : undefined}
                onClick={() => onSelect(day.date)}
                className={`${ITEM} ${day.date === selected ? SELECTED : IDLE}`}
              >
                <span title={title} className="truncate font-body text-sm text-bone0">{title}</span>
                <span className="font-mono text-[10px] tracking-[0.5px] text-ink6">{dayLabel(day.date, today)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
