import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Select from '@/components/shared/ui/Select';
import { validateSlots } from '@/utils/agenda';
import { DAY_NAMES, hourLabel, hourOptions } from './availability';

const FROM_OPTIONS = hourOptions(0, 22);
const TO_OPTIONS = hourOptions(1, 23);

function Draft({ weekday, onAdd, onCancel }) {
  const [start, setStart] = useState('9');
  const [end, setEnd] = useState('10');
  const [error, setError] = useState(null);
  const day = DAY_NAMES[weekday - 1].toLowerCase();

  function add() {
    const slot = { weekday, start_time: hourLabel(Number(start)), end_time: hourLabel(Number(end)) };
    const [message] = Object.values(validateSlots([slot]));
    if (message) setError(message);
    else onAdd(slot);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Select label={`Desde (${day})`} options={FROM_OPTIONS} value={start} onChange={(e) => setStart(e.target.value)} className="flex-1" />
        <Select label={`Hasta (${day})`} options={TO_OPTIONS} value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1" />
      </div>
      {error && <p role="alert" className="font-mono text-[11px] text-hot">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={add}>{`Agregar franja del ${day}`}</Button>
      </div>
    </div>
  );
}

/** Una fila de día: sus franjas con ✕, errores por franja y el alta de una nueva. */
export default function DaySlots({ weekday, slots, errors, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const day = DAY_NAMES[weekday - 1];
  return (
    <section aria-label={day} className="flex flex-col gap-2 border-b border-ink3 py-3 last:border-b-0">
      <h3 className="font-display text-sm font-semibold text-bone0">{day}</h3>
      <ul className="flex flex-col gap-1.5">
        {slots.map(({ slot, index }) => {
          const range = `${slot.start_time} – ${slot.end_time}`;
          return (
            <li key={index} className="flex flex-col">
              <span className="flex items-center gap-2 font-mono text-sm text-bone1">
                {range}
                <button
                  type="button"
                  aria-label={`Quitar franja ${slot.start_time} a ${slot.end_time} del ${day.toLowerCase()}`}
                  onClick={() => onRemove(index)}
                  className="cursor-pointer rounded p-0.5 text-ink6 hover:text-hot"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
              {errors[index] && <span role="alert" className="font-mono text-[11px] text-hot">{errors[index]}</span>}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <Draft weekday={weekday} onAdd={(slot) => { onAdd(slot); setAdding(false); }} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label={`Agregar franja al ${day.toLowerCase()}`}
          className="cursor-pointer self-start font-mono text-xs text-accentText hover:underline"
        >
          + Agregar franja
        </button>
      )}
    </section>
  );
}
