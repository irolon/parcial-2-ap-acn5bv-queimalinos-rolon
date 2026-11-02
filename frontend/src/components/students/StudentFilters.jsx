import { Search } from 'lucide-react';
import Select from '@/components/shared/ui/Select';
import { GOAL_OPTIONS } from '@/utils/students/studentOptions';

const OBJETIVOS = [{ value: '', label: 'Todos' }, ...GOAL_OPTIONS.filter((o) => o.value)];
const ESTADOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'al-dia', label: 'Al día' },
  { value: 'nuevos', label: 'Nuevos' },
  { value: 'baja', label: 'Dados de baja' },
];
const ORDENES = [
  { value: 'ultima-sesion', label: 'Última sesión' },
  { value: 'nombre', label: 'Nombre' },
  { value: 'alta', label: 'Alta reciente' },
  { value: 'racha', label: 'Racha' },
];

/** Buscador y selects del panel; `onChange` recibe los filtros completos. */
export default function StudentFilters({ filters, onChange }) {
  const set = (key) => (event) => onChange({ ...filters, [key]: event.target.value });
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink5" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar alumno"
          placeholder="Buscar alumno…"
          value={filters.q}
          onChange={set('q')}
          className="h-[46px] w-full rounded-md border border-ink3 bg-ink1 pl-10 pr-3.5 font-body text-sm text-bone0 outline-none placeholder:text-ink5 focus:border-accentText"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select label="Objetivo" options={OBJETIVOS} value={filters.objetivo} onChange={set('objetivo')} />
        <Select label="Estado" options={ESTADOS} value={filters.estado} onChange={set('estado')} />
        <Select label="Orden" options={ORDENES} value={filters.orden} onChange={set('orden')} />
      </div>
    </div>
  );
}
