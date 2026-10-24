let seq = 0;

/** Ejercicio con los campos del backend; `overrides` pisa cualquiera. */
export function exercise(overrides = {}) {
  seq += 1;
  return {
    id: `ex-${seq}`,
    trainer_id: null,
    name: `Ejercicio ${seq}`,
    muscle_group: 'chest',
    equipment: 'barbell',
    description: 'Descripción del ejercicio.',
    video_url: null,
    is_global: true,
    ...overrides,
  };
}

export const LIBRARY = [
  exercise({
    id: 'ex-bench',
    name: 'Press banca plano',
    muscle_group: 'chest',
    equipment: 'barbell',
    description: 'Empuje horizontal con barra sobre banco plano.',
    video_url: 'https://www.youtube.com/watch?v=uEtiwYaT3d0',
  }),
  exercise({
    id: 'ex-squat',
    name: 'Sentadilla',
    muscle_group: 'legs',
    equipment: 'barbell',
    description: 'Flexión de cadera y rodillas con la barra en la espalda.',
  }),
  exercise({
    id: 'ex-plank',
    name: 'Plancha',
    muscle_group: 'core',
    equipment: 'bodyweight',
    description: 'Sostené el cuerpo recto apoyado en antebrazos y puntas.',
  }),
  exercise({
    id: 'ex-incline',
    name: 'Press inclinado con mancuernas',
    muscle_group: 'chest',
    equipment: 'dumbbell',
    description: 'Empuje inclinado con mancuernas.',
    trainer_id: 't-1',
    is_global: false,
  }),
  exercise({
    id: 'ex-calf',
    name: 'Elevación de talones',
    muscle_group: 'calves',
    equipment: null,
    description: 'Elevación sobre las puntas de los pies.',
    trainer_id: 't-1',
    is_global: false,
  }),
];
