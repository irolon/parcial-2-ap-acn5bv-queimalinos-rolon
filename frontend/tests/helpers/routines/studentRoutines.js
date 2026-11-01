import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

/** Ejercicio de una rutina como lo devuelve el backend (sin `last_session_kg`: lo suma solo /today). */
export function routineExercise(overrides = {}) {
  return {
    routine_exercise_id: 're-1',
    exercise: { id: 'e-1', name: 'Press banca', muscle_group: 'chest', equipment: 'barbell', video_url: null },
    sets: 4,
    reps: 10,
    rest_seconds: 90,
    suggested_kg: 60,
    tempo: null,
    notes: null,
    order_index: 0,
    ...overrides,
  };
}

const SECOND_EXERCISE = {
  routine_exercise_id: 're-2',
  exercise: { id: 'e-2', name: 'Remo con barra', muscle_group: 'back', equipment: 'barbell', video_url: 'https://youtu.be/x' },
  sets: 3,
  reps: 12,
  rest_seconds: 60,
  suggested_kg: null,
  order_index: 1,
};

/** Rutina como la devuelve GET /routines/today: sin `created_at` y con `last_session_kg` en cada ejercicio. */
export function todayRoutine(overrides = {}) {
  return {
    routine_id: 'r-1',
    name: 'Push · día 3',
    goal: 'hypertrophy',
    days: ['monday', 'thursday'],
    exercises: [
      { ...routineExercise(), last_session_kg: 62.5 },
      { ...routineExercise(SECOND_EXERCISE), last_session_kg: null },
    ],
    ...overrides,
  };
}

/** Rutina como la devuelve GET /routines/mine: con `created_at` y sin `last_session_kg`. */
export function mineRoutine(overrides = {}) {
  return {
    routine_id: 'r-1',
    name: 'Push · día 3',
    goal: 'hypertrophy',
    days: ['monday', 'thursday'],
    created_at: '2026-10-20T12:00:00Z',
    exercises: [routineExercise(), routineExercise(SECOND_EXERCISE)],
    ...overrides,
  };
}

/**
 * Stub de `GET /routines/today` y `GET /routines/mine` sobre `stubFetch`.
 * - `today`: la rutina del día, `null` (día de descanso o sin rutina), un status de error o una función que la arma en cada GET.
 * - `mine`: la lista de rutinas activas, un status de error o una función. Lo que no sea de rutinas devuelve 500.
 */
export function stubStudentRoutines({ today = null, mine = [] } = {}) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    const answers = { '/routines/today': today, '/routines/mine': mine };
    if (!(path in answers)) return errorResponse(500, 'INTERNAL', 'Sin handler');
    const answer = typeof answers[path] === 'function' ? answers[path]() : answers[path];
    return typeof answer === 'number' ? errorResponse(answer, 'INTERNAL') : jsonResponse(200, { data: answer });
  });
}
