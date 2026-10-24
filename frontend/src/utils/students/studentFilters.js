import { activityStatus } from './activity';

export const DEFAULT_FILTERS = { estado: 'todos', objetivo: '', orden: 'ultima-sesion', q: '' };
export const ESTADOS = ['todos', 'inactivos', 'al-dia', 'nuevos', 'baja'];
export const ORDENES = ['ultima-sesion', 'nombre', 'alta'];

const STATUS_BY_ESTADO = { inactivos: 'inactive', 'al-dia': 'active', nuevos: 'new', baja: 'disabled' };

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Filtros desde la URL; lo inválido cae al default. */
export function parseStudentFilters(searchParams) {
  const estado = searchParams.get('estado');
  const orden = searchParams.get('orden');
  return {
    estado: ESTADOS.includes(estado) ? estado : DEFAULT_FILTERS.estado,
    objetivo: searchParams.get('objetivo') ?? DEFAULT_FILTERS.objetivo,
    orden: ORDENES.includes(orden) ? orden : DEFAULT_FILTERS.orden,
    q: searchParams.get('q') ?? DEFAULT_FILTERS.q,
  };
}

/** Query string sin los valores por defecto; `''` si todo es default. */
export function filtersToSearch(filters) {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_FILTERS)) {
    if (filters[key] !== DEFAULT_FILTERS[key]) params.set(key, filters[key]);
  }
  return params.toString();
}

export function filterStudents(students, filters, now) {
  const q = normalize(filters.q);
  return students.filter(
    (s) =>
      (filters.estado === 'todos' || activityStatus(s, now) === STATUS_BY_ESTADO[filters.estado]) &&
      (!filters.objetivo || s.goal === filters.objetivo) &&
      (!q || normalize(s.name).includes(q)),
  );
}

const byCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at);

const COMPARATORS = {
  'ultima-sesion': (a, b) => {
    if (a.last_session_at && b.last_session_at) return new Date(a.last_session_at) - new Date(b.last_session_at);
    if (a.last_session_at) return 1;
    if (b.last_session_at) return -1;
    return byCreated(a, b);
  },
  nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
  alta: (a, b) => byCreated(b, a),
};

/** Copia ordenada; "ultima-sesion" pone primero a quienes nunca entrenaron. */
export function sortStudents(students, orden) {
  return [...students].sort(COMPARATORS[orden] ?? COMPARATORS[DEFAULT_FILTERS.orden]);
}

export function neighbors(students, id) {
  const index = students.findIndex((s) => s.id === id);
  return {
    prev: index > 0 ? students[index - 1] : null,
    next: index >= 0 && index < students.length - 1 ? students[index + 1] : null,
    index,
    total: students.length,
  };
}
