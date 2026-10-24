import {
  validateUpdateRoutineExercise,
  validateRoutineExerciseParams,
  validateCreateRoutine,
  validateUpdateRoutine,
  validateAddExercises,
} from '../../../../src/validations/routines/routines.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const OK = { exercise_id: UUID, sets: 3, reps: 10 };

const patchError = (body) => {
  try {
    validateUpdateRoutineExercise(body);
  } catch (err) {
    return err.details.map((d) => d.field);
  }
  return [];
};
const fieldsOf = (fn, input) => {
  try {
    fn(input);
  } catch (err) {
    return err.details.map((d) => d.field);
  }
  return [];
};
const createBody = (patch = {}) => ({
  student_id: UUID,
  name: 'Full body',
  goal: 'hypertrophy',
  days: ['monday'],
  exercises: [OK],
  ...patch,
});


describe('validateUpdateRoutineExercise', () => {
  it('{} es error en body', () => {
    expect(patchError({})).toEqual(['body']);
  });
  it('null borra un opcional', () => {
    expect(validateUpdateRoutineExercise({ suggested_kg: null })).toEqual({ suggested_kg: null });
  });
  it('sets null es error', () => {
    expect(patchError({ sets: null })).toEqual(['sets']);
  });
  it('ignora campos desconocidos', () => {
    expect(validateUpdateRoutineExercise({ sets: 5, exercise_id: UUID, foo: 1 })).toEqual({
      sets: 5,
    });
  });
});

describe('validateRoutineExerciseParams', () => {
  it('acepta dos UUID y rechaza lo demás', () => {
    expect(validateRoutineExerciseParams({ id: UUID, routineExerciseId: UUID })).toEqual({
      id: UUID,
      routineExerciseId: UUID,
    });
    expect(() => validateRoutineExerciseParams({ id: UUID, routineExerciseId: 'x' })).toThrow(
      expect.objectContaining({ statusCode: 400 })
    );
  });
});

describe('validateCreateRoutine', () => {
  it('un rest_seconds inválido ya no se pierde en silencio', () => {
    const body = createBody({ exercises: [{ ...OK, rest_seconds: -1 }] });
    expect(() => validateCreateRoutine(body)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );
  });
  it('rechaza días repetidos', () => {
    expect(fieldsOf(validateCreateRoutine, createBody({ days: ['monday', 'monday'] }))).toEqual([
      'days',
    ]);
  });
  it('acepta días distintos', () => {
    expect(validateCreateRoutine(createBody({ days: ['monday', 'friday'] })).days).toEqual([
      'monday',
      'friday',
    ]);
  });
});

describe('orden de los ejercicios', () => {
  const mixed = [{ ...OK, order: 1 }, { ...OK }];
  it('POST /routines renumera 0..n-1 sin repetidos', () => {
    const out = validateCreateRoutine(createBody({ exercises: mixed }));
    expect(out.exercises.map((e) => e.order)).toEqual([0, 1]);
  });
  it('POST /routines/:id/exercises renumera la lista nueva', () => {
    const repeated = [{ ...OK, order: 2 }, { ...OK, order: 2 }];
    expect(validateAddExercises({ exercises: repeated }).exercises.map((e) => e.order)).toEqual([0, 1]);
  });
});

describe('validateUpdateRoutine', () => {
  it('rechaza días repetidos, vacíos o inválidos', () => {
    expect(fieldsOf(validateUpdateRoutine, { days: ['friday', 'friday'] })).toContain('days');
    expect(fieldsOf(validateUpdateRoutine, { days: [] })).toContain('days');
    expect(fieldsOf(validateUpdateRoutine, { days: ['funday'] })).toContain('days');
  });
  it('acepta días distintos', () => {
    expect(validateUpdateRoutine({ days: ['monday', 'friday'] })).toEqual({
      days: ['monday', 'friday'],
    });
  });
});
