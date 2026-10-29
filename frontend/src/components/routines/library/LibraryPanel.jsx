import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Select from '@/components/shared/ui/Select';
import LibraryItem from './LibraryItem';
import { EQUIPMENT_OPTIONS, muscleLabel } from '@/utils/exercises/exerciseOptions';
import { ALL, INITIAL_FILTERS, filterExercises, muscleGroupsIn } from '@/utils/exercises/filterExercises';

const EQUIPMENT_FILTER_OPTIONS = [{ value: '', label: 'Todo el equipamiento' }, ...EQUIPMENT_OPTIONS.slice(1)];

function Chip({ checked, onClick, children }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={`cursor-pointer rounded-pill border px-2.5 py-1 font-mono text-[10px] uppercase focus-visible:outline-2 focus-visible:outline-accentText ${
        checked ? 'border-transparent bg-accent text-accentInk' : 'border-ink3 bg-ink1 text-ink6 hover:text-bone0'
      }`}
    >
      {children}
    </button>
  );
}

/** Biblioteca compacta del editor: buscador, músculo, equipamiento y lista con "+". */
export default function LibraryPanel({ exercises, onAdd }) {
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const set = (patch) => setFilters((current) => ({ ...current, ...patch }));
  const groups = useMemo(() => muscleGroupsIn(exercises), [exercises]);
  const visible = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink5" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar ejercicio"
          placeholder="Buscar ejercicio…"
          value={filters.search}
          onChange={(event) => set({ search: event.target.value })}
          className="h-10 w-full rounded-md border border-ink3 bg-ink1 pl-9 pr-3 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText"
        />
      </div>
      <div role="radiogroup" aria-label="Grupo muscular" className="flex flex-wrap gap-1.5">
        {[ALL, ...groups].map((code) => (
          <Chip key={code} checked={filters.muscle === code} onClick={() => set({ muscle: code })}>
            {code === ALL ? 'Todos' : muscleLabel(code)}
          </Chip>
        ))}
      </div>
      <Select
        label="Equipamiento"
        options={EQUIPMENT_FILTER_OPTIONS}
        value={filters.equipment}
        onChange={(event) => set({ equipment: event.target.value })}
      />
      {visible.length === 0 ? (
        <p className="font-body text-sm text-ink6">No hay ejercicios con esos filtros.</p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {visible.map((exercise) => (
            <LibraryItem key={exercise.id} exercise={exercise} onAdd={onAdd} />
          ))}
        </ul>
      )}
    </div>
  );
}
