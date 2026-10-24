import { Search } from 'lucide-react';
import Select from '@/components/shared/ui/Select';
import { ALL } from '@/hooks/exercises/filterExercises';
import { EQUIPMENT_OPTIONS, muscleLabel } from './exerciseOptions';

const EQUIPMENT_FILTER_OPTIONS = [{ value: '', label: 'Todo el equipamiento' }, ...EQUIPMENT_OPTIONS.slice(1)];
const ORIGINS = [
  { value: ALL, label: 'Todos' },
  { value: 'own', label: 'Propios' },
  { value: 'global', label: 'Globales' },
];

function Radio({ checked, onClick, children, rounded }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`cursor-pointer border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.3px] focus-visible:outline-2 focus-visible:outline-accentText ${rounded} ${
        checked ? 'border-transparent bg-accent text-accentInk' : 'border-ink3 bg-ink1 text-ink6 hover:text-bone0'
      }`}
    >
      {children}
    </button>
  );
}

export default function ExerciseFilters({ filters, groups, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink5" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar ejercicio"
          placeholder="Buscar ejercicio…"
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
          className="h-[46px] w-full rounded-md border border-ink3 bg-ink1 pl-10 pr-3.5 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText"
        />
      </div>
      <div role="radiogroup" aria-label="Grupo muscular" className="flex flex-wrap gap-2">
        {[ALL, ...groups].map((code) => (
          <Radio key={code} rounded="rounded-pill" checked={filters.muscle === code} onClick={() => set({ muscle: code })}>
            {code === ALL ? 'Todos' : muscleLabel(code)}
          </Radio>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Equipamiento"
          options={EQUIPMENT_FILTER_OPTIONS}
          value={filters.equipment}
          onChange={(event) => set({ equipment: event.target.value })}
          className="w-full sm:w-64"
        />
        <div role="radiogroup" aria-label="Origen" className="flex gap-1">
          {ORIGINS.map(({ value, label }) => (
            <Radio key={value} rounded="rounded-md" checked={filters.origin === value} onClick={() => set({ origin: value })}>
              {label}
            </Radio>
          ))}
        </div>
      </div>
    </div>
  );
}
