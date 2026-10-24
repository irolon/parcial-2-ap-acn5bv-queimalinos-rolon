// Estas listas deben coincidir con las de backend/src/models/exercises/exercise.model.js (lo verifica un test).
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'glutes',
  'biceps',
  'triceps',
  'core',
  'calves',
  'full_body',
  'cardio',
];

export const MUSCLE_LABELS = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  legs: 'Piernas',
  glutes: 'Glúteos',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  core: 'Core',
  calves: 'Gemelos',
  full_body: 'Cuerpo completo',
  cardio: 'Cardio',
};

export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band'];

export const EQUIPMENT_LABELS = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  band: 'Banda',
};

/** Etiqueta del grupo muscular; un código desconocido se muestra tal cual. */
export function muscleLabel(code) {
  return MUSCLE_LABELS[code] ?? code;
}

/** Etiqueta del equipamiento; `null` (sin equipamiento) → `null`. */
export function equipmentLabel(code) {
  if (code == null) return null;
  return EQUIPMENT_LABELS[code] ?? code;
}

export const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_LABELS[value] }));

export const EQUIPMENT_OPTIONS = [
  { value: '', label: 'Sin equipamiento' },
  ...EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] })),
];
