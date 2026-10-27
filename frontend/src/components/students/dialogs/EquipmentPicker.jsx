import { X } from 'lucide-react';
import Button from '@/components/shared/ui/Button';
import Input from '@/components/shared/ui/Input';
import { EQUIPMENT, EQUIPMENT_LABELS } from '@/utils/exercises/exerciseOptions';
import { MAX_EQUIPMENT, MAX_EQUIPMENT_LENGTH, addEquipment } from '@/utils/students/studentForm';

const CHIP = 'rounded-full border px-3 py-1.5 font-body text-sm focus-visible:outline-2 focus-visible:outline-accentText';
const ON = 'border-accentText bg-accent/15 text-accentText';
const OFF = 'border-ink3 text-bone0 hover:bg-white/[0.06]';

/**
 * Chips para marcar los equipos del catálogo y sumar otros a mano; `value` es la lista guardada.
 * El texto de "Agregar otro" (`draft`) lo maneja quien monta el picker, para poder sumarlo al guardar.
 */
export default function EquipmentPicker({ value, onChange, draft, onDraftChange }) {
  const others = value.filter((item) => !EQUIPMENT.includes(item));
  const full = value.length >= MAX_EQUIPMENT;

  const toggle = (code) => onChange(value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);
  function add() {
    onChange(addEquipment(value, draft));
    onDraftChange('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {EQUIPMENT.map((code) => {
          const checked = value.includes(code);
          return (
            <button
              key={code}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(code)}
              className={`${CHIP} ${checked ? ON : OFF}`}
            >
              {EQUIPMENT_LABELS[code]}
            </button>
          );
        })}
      </div>
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {others.map((item) => (
            <li key={item} className={`${CHIP} ${ON} flex items-center gap-1.5`}>
              <span>{item}</span>
              <button
                type="button"
                aria-label={`Quitar ${item}`}
                onClick={() => onChange(value.filter((other) => other !== item))}
                className="rounded-full hover:text-bone0"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Input
          label="Agregar otro"
          className="flex-1"
          value={draft}
          maxLength={MAX_EQUIPMENT_LENGTH}
          autoComplete="off"
          disabled={full}
          hint={full ? `Llegaste al máximo de ${MAX_EQUIPMENT}` : undefined}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            add();
          }}
        />
        <Button variant="dark" onClick={add} disabled={full || !draft.trim()}>
          Agregar
        </Button>
      </div>
    </div>
  );
}
