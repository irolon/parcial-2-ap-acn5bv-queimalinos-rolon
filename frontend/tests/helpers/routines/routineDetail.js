import { EX_A, EX_B, EX_C } from './fixtures';

export const RE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const RE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const RE_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const ROUTINE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const NAMES = { [EX_A]: 'Sentadilla', [EX_B]: 'Remo', [EX_C]: 'Press' };

/** Ejercicio de `GET /routines/:id` (forma de `mapRoutineExercises`). */
export function detailExercise(id, exerciseId, order, values = {}) {
  return {
    routine_exercise_id: id,
    exercise: { id: exerciseId, name: NAMES[exerciseId] ?? 'Otro', muscle_group: 'legs', equipment: null, video_url: null },
    sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60, tempo: null, notes: null, order_index: order,
    ...values,
  };
}

/** Rutina de `GET /routines/:id`: A (RE_A) y B (RE_B), en ese orden. */
export function routineDetail(overrides = {}) {
  return {
    id: ROUTINE_ID, trainer_id: 't-1', student_id: 'st-ana', template_id: null, name: 'Fuerza A', goal: 'strength',
    level: 'beginner', days: ['monday', 'thursday'], active: true, created_at: '2026-11-01T10:00:00Z',
    exercises: [detailExercise(RE_A, EX_A, 0), detailExercise(RE_B, EX_B, 1, { suggested_kg: null, notes: 'Lento' })],
    ...overrides,
  };
}
