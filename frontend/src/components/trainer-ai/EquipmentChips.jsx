import { EQUIPMENT, EQUIPMENT_LABELS } from '@/utils/exercises/exerciseOptions';

// Mismos chips que el contexto para la IA de la ficha (`EquipmentPicker`), sin "Agregar otro": el backend solo acepta el catálogo.
const CHIP = 'cursor-pointer rounded-full border px-3 py-1.5 font-body text-sm focus-visible:outline-2 focus-visible:outline-accentText';
const ON = 'border-accentText bg-accent/15 text-accentText';
const OFF = 'border-ink3 text-bone0 hover:bg-white/[0.06]';

/** Chips de los 7 equipamientos del catálogo con `role="checkbox"`; `value` es la lista elegida. */
export default function EquipmentChips({ value, onChange }) {
  const toggle = (code) => onChange(value.includes(code) ? value.filter((item) => item !== code) : [...value, code]);
  return (
    <div role="group" aria-labelledby="ai-equipment-label">
      <span id="ai-equipment-label" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[1px] text-ink6">
        Equipamiento
      </span>
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
      <p className="mt-1.5 font-mono text-[10px] text-ink6">Sin nada marcado, la IA usa solo peso corporal.</p>
    </div>
  );
}
