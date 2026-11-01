import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { DAY_NAMES, hourLabel, hourOptions } from './availability';

const FROM_OPTIONS = hourOptions(0, 22);
const TO_OPTIONS = hourOptions(1, 23);
const SELECT_CLASS =
  'h-9 rounded-md border border-ink3 bg-ink1 px-2 font-mono text-sm text-bone0 outline-none focus:border-accentText';

const hourOf = (time) => String(Number(time.slice(0, 2)));

function Options({ options }) {
  return options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>);
}

function SlotRow({ slot, position, day, error, autoFocus, onChange, onRemove }) {
  const set = (key) => (e) => onChange({ ...slot, [key]: hourLabel(Number(e.target.value)) });
  const where = `franja ${position} del ${day}`;
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select aria-label={`Desde, ${where}`} autoFocus={autoFocus} value={hourOf(slot.start_time)} onChange={set('start_time')} className={SELECT_CLASS}>
          <Options options={FROM_OPTIONS} />
        </select>
        <span className="font-mono text-sm text-ink6" aria-hidden="true">–</span>
        <select aria-label={`Hasta, ${where}`} value={hourOf(slot.end_time)} onChange={set('end_time')} className={SELECT_CLASS}>
          <Options options={TO_OPTIONS} />
        </select>
        <button
          type="button"
          aria-label={`Quitar franja ${slot.start_time} a ${slot.end_time} del ${day}`}
          onClick={onRemove}
          className="cursor-pointer rounded p-0.5 text-ink6 hover:text-hot"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {error && <span role="alert" className="font-mono text-[11px] text-hot">{error}</span>}
    </li>
  );
}

/** Una fila de día: sus franjas editables con ✕, errores por franja y el alta de una nueva. */
export default function DaySlots({ weekday, slots, errors, onAdd, onChange, onRemove }) {
  const [focusLast, setFocusLast] = useState(false);
  const addRef = useRef(null);
  const name = DAY_NAMES[weekday - 1];
  const day = name.toLowerCase();
  return (
    <section aria-label={name} className="flex flex-col gap-2 border-b border-ink3 py-3 last:border-b-0">
      <h3 className="font-display text-sm font-semibold text-bone0">{name}</h3>
      <ul className="flex flex-col gap-2">
        {slots.map(({ slot, index }, i) => (
          <SlotRow
            key={index}
            slot={slot}
            position={i + 1}
            day={day}
            error={errors[index]}
            autoFocus={focusLast && i === slots.length - 1}
            onChange={(next) => onChange(index, next)}
            onRemove={() => {
              setFocusLast(false);
              onRemove(index);
              addRef.current?.focus();
            }}
          />
        ))}
      </ul>
      <button
        ref={addRef}
        type="button"
        onClick={() => {
          setFocusLast(true);
          onAdd(weekday);
        }}
        aria-label={`Agregar franja al ${day}`}
        className="cursor-pointer self-start font-mono text-xs text-accentText hover:underline"
      >
        + Agregar franja
      </button>
    </section>
  );
}
