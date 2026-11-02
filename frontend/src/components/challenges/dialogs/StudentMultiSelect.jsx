import { useState } from 'react';
import Input from '@/components/shared/ui/Input';
import { normalize } from '@/utils/students/studentFilters';

export const MAX_SELECTED = 50;

/**
 * Lista de alumnos con checkbox y buscador por nombre (sin tildes). Los de `disabledIds` aparecen
 * deshabilitados con "Ya lo tiene". `selected` son los ids marcados; se puede pasar de `MAX_SELECTED`,
 * pero se avisa (quien lo monta no deja asignar).
 */
export default function StudentMultiSelect({ students, disabledIds, selected, onChange }) {
  const [search, setSearch] = useState('');
  const q = normalize(search);
  const visible = q ? students.filter((s) => normalize(s.name).includes(q)) : students;
  const count = selected.length;

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        label="Buscar alumno"
        type="search"
        autoComplete="off"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {visible.map((s) => {
          const has = disabledIds.has(s.id);
          return (
            <li key={s.id}>
              <label
                className={`flex items-center gap-3 rounded-md px-2 py-2 font-body text-sm ${
                  has ? 'cursor-not-allowed text-ink6' : 'cursor-pointer text-bone0 hover:bg-white/[0.06]'
                }`}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={has || selected.includes(s.id)}
                  disabled={has}
                  onChange={() => toggle(s.id)}
                />
                <span className="flex-1 truncate">{s.name}</span>
                {has && <span className="font-mono text-[11px] text-ink6">Ya lo tiene</span>}
              </label>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && <p className="font-body text-sm text-ink6">Ningún alumno coincide con la búsqueda</p>}
      <p className={`font-mono text-[11px] ${count > MAX_SELECTED ? 'text-hot' : 'text-ink6'}`}>
        {count === 1 ? '1 seleccionado' : `${count} seleccionados`}
      </p>
      {count > MAX_SELECTED && <p className="font-mono text-[11px] text-hot">Hasta {MAX_SELECTED} alumnos por vez</p>}
    </div>
  );
}
