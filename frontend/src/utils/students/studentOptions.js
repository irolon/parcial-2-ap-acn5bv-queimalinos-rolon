// Objetivos y niveles del alumno (valores = los del backend). `''` es "Sin definir".
export const GOAL_OPTIONS = [
  { value: '', label: 'Sin definir' },
  { value: 'tonify', label: 'Tonificar' },
  { value: 'weight_loss', label: 'Bajar de peso' },
  { value: 'hypertrophy', label: 'Ganar masa muscular' },
  { value: 'strength', label: 'Ganar fuerza' },
];

export const LEVEL_OPTIONS = [
  { value: '', label: 'Sin definir' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

const labelOf = (options, value) => options.find((o) => o.value && o.value === value)?.label;

/** Etiqueta del objetivo, o `undefined` si no hay o no es conocido. */
export const goalLabel = (value) => labelOf(GOAL_OPTIONS, value);

/** Etiqueta del nivel, o `undefined` si no hay o no es conocido. */
export const levelLabel = (value) => labelOf(LEVEL_OPTIONS, value);

const days = (n, sep) => `${n} ${n === 1 ? 'día' : 'días'}${sep}semana`;

/** Frecuencia semanal (días por semana que quiere entrenar, 1 a 7). Los valores van como texto en el select. */
export const FREQUENCY_OPTIONS = [
  { value: '', label: 'Sin definir' },
  ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: days(n, ' / ') })),
];

/** "4 días/semana", o `undefined` sin frecuencia válida. */
export const frequencyLabel = (value) =>
  Number.isInteger(value) && value >= 1 && value <= 7 ? days(value, '/') : undefined;
