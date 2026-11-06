/** Ejercicio de un bloque como lo devuelve `POST /trainer-ai/generate-routine`. */
export const aiItem = (exerciseId, exerciseName, extra = {}) => ({
  exercise_id: exerciseId, exercise_name: exerciseName, sets: 4, reps: 8, rest_seconds: 90, suggested_kg: null, notes: null, ...extra,
});

/** Propuesta de 3 bloques (lunes, miércoles, viernes) con ejercicios de `LIBRARY`. */
export const SPLIT = {
  generation_id: 'g-split',
  routine_proposal: {
    rationale: 'Split de empuje, piernas y core para 3 días.',
    routines: [
      {
        name: 'Empuje',
        days: ['monday'],
        exercises: [
          aiItem('ex-bench', 'Press banca plano', { suggested_kg: 40, notes: 'Bajada controlada' }),
          aiItem('ex-incline', 'Press inclinado con mancuernas'),
        ],
      },
      { name: 'Piernas', days: ['wednesday'], exercises: [aiItem('ex-squat', 'Sentadilla', { sets: 5, reps: 5, rest_seconds: 120 })] },
      { name: 'Core', days: ['friday'], exercises: [aiItem('ex-plank', 'Plancha', { reps: 1, rest_seconds: 60 })] },
    ],
  },
};

/** Propuesta de 1 bloque; `ex-gone` no está en `LIBRARY`. */
export const SINGLE = {
  generation_id: 'g-single',
  routine_proposal: {
    rationale: 'Full body tres veces por semana.',
    routines: [
      {
        name: 'Full body',
        days: ['monday', 'wednesday', 'friday'],
        exercises: [aiItem('ex-squat', 'Sentadilla'), aiItem('ex-gone', 'Ejercicio borrado')],
      },
    ],
  },
};

/** Clave de `sessionStorage` donde vive la propuesta del entrenador. */
export const AI_STORAGE_KEY = (trainerId) => `fittrainer.ai-proposal.${trainerId}`;
