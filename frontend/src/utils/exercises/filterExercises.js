import { MUSCLE_GROUPS } from './exerciseOptions';

export const ALL = 'all';

export const INITIAL_FILTERS = { muscle: ALL, equipment: '', origin: ALL, search: '' };

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** Grupos con al menos un ejercicio: orden del backend y desconocidos al final. */
export function muscleGroupsIn(exercises) {
  const present = new Set(exercises.map((e) => e.muscle_group));
  const known = MUSCLE_GROUPS.filter((code) => present.has(code));
  const unknown = [...present].filter((code) => !MUSCLE_GROUPS.includes(code));
  return [...known, ...unknown];
}

/** AND de músculo, equipamiento, origen y búsqueda por nombre; conserva el orden. */
export function filterExercises(exercises, filters) {
  const search = normalize(filters.search);
  return exercises.filter(
    (e) =>
      (filters.muscle === ALL || e.muscle_group === filters.muscle) &&
      (!filters.equipment || e.equipment === filters.equipment) &&
      (filters.origin === ALL || (filters.origin === 'own') === !e.is_global) &&
      (!search || normalize(e.name).includes(search)),
  );
}
