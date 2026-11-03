import { validateReorderExercises } from '../../../../src/validations/routines/routines.validation.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ids = (n) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);

describe('validateReorderExercises', () => {
  it('acepta un arreglo de UUID sin repetidos', () => {
    expect(validateReorderExercises({ routine_exercise_ids: [B, A] })).toEqual({
      routine_exercise_ids: [B, A],
    });
  });

  it('acepta hasta 100', () => {
    expect(validateReorderExercises({ routine_exercise_ids: ids(100) }).routine_exercise_ids).toHaveLength(100);
  });

  it.each([
    ['sin body', undefined],
    ['sin el campo', {}],
    ['vacío', { routine_exercise_ids: [] }],
    ['no es arreglo', { routine_exercise_ids: A }],
    ['un id inválido', { routine_exercise_ids: [A, 'x'] }],
    ['repetidos', { routine_exercise_ids: [A, A] }],
    ['más de 100', { routine_exercise_ids: ids(101) }],
  ])('rechaza %s con 400', (_caso, body) => {
    expect(() => validateReorderExercises(body)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        details: [expect.objectContaining({ field: 'routine_exercise_ids' })],
      })
    );
  });
});
