import { addExercise, EMPTY_ROUTINE } from '@/utils/routines/editorState';

export const EX_A = '11111111-1111-4111-8111-111111111111';
export const EX_B = '22222222-2222-4222-8222-222222222222';
export const EX_C = '33333333-3333-4333-8333-333333333333';

export const exercisesById = new Map([
  [EX_A, { id: EX_A, name: 'Sentadilla' }],
  [EX_B, { id: EX_B, name: 'Remo' }],
  [EX_C, { id: EX_C, name: 'Press' }],
]);

/** Estado del editor con cabecera válida y los ejercicios pedidos. */
export function stateWith(ids = [EX_A, EX_B], header = {}) {
  const base = { ...EMPTY_ROUTINE, name: 'Fuerza', goal: 'strength', days: ['monday'], ...header };
  return ids.reduce(addExercise, base);
}

export function templateFixture(overrides = {}) {
  return {
    id: 't-1',
    name: 'Plantilla full body',
    goal: 'hypertrophy',
    level: 'beginner',
    structure: {
      version: 1,
      days: ['monday', 'friday'],
      exercises: [
        { exercise_id: EX_A, sets: 4, reps: 8, rest_seconds: 60, suggested_kg: 20.5, tempo: '3-1-1', notes: 'Bajar lento', order: 0, exercise: { id: EX_A } },
        { exercise_id: EX_B, sets: 3, reps: 10, rest_seconds: null, suggested_kg: null, tempo: null, notes: null, order: 1, exercise: { id: EX_B } },
      ],
    },
    ...overrides,
  };
}
