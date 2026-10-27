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
