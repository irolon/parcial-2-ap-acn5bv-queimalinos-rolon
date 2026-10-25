import { activityStatus, daysWithoutTraining } from './activity';

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
const byName = (a, b) => a.name.localeCompare(b.name, 'es');

const comparators = (now) => ({
  'ultima-sesion': (a, b) => daysWithoutTraining(b, now) - daysWithoutTraining(a, now) || byName(a, b),
  nombre: byName,
  alta: (a, b) => byCreated(b, a),
});

/** Copia ordenada; "ultima-sesion" pone primero a quienes llevan más días sin entrenar. */
export function sortStudents(students, orden, now = new Date()) {
  const all = comparators(now);
  return [...students].sort(all[orden] ?? all[DEFAULT_FILTERS.orden]);
}

const MAX_ALERTS = 5;

/** Hasta 5 alumnos inactivos, los que más días llevan sin entrenar primero. */
export function inactiveStudents(students, now) {
  const inactive = students.filter((s) => activityStatus(s, now) === 'inactive');
  return sortStudents(inactive, 'ultima-sesion', now).slice(0, MAX_ALERTS);
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
