import { validateExerciseItem } from '../../../../src/validations/routines/routine-exercise.validation.js';
import {
  validateUpdateRoutineExercise,
  validateRoutineExerciseParams,
  validateCreateRoutine,
} from '../../../../src/validations/routines/routines.validation.js';

const UUID = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const OK = { exercise_id: UUID, sets: 3, reps: 10 };

const itemErrors = (patch) => {
  const details = [];
  validateExerciseItem({ ...OK, ...patch }, 'exercises[0]', details);
  return details.map((d) => d.field);
};
const patchError = (body) => {
  try {
    validateUpdateRoutineExercise(body);
  } catch (err) {
    return err.details.map((d) => d.field);
  }
  return [];
};

describe('validateExerciseItem', () => {
  it('ítem válido con opcionales ausentes los deja en null', () => {
    const details = [];
    const out = validateExerciseItem(OK, 'exercises[0]', details);
    expect(details).toEqual([]);
    expect(out).toEqual({
      exercise_id: UUID,
      sets: 3,
      reps: 10,
      rest_seconds: null,
      suggested_kg: null,
      tempo: null,
      notes: null,
      order: undefined,
    });
  });
  it('sets: 0 es error en exercises[0].sets', () => {
    expect(itemErrors({ sets: 0 })).toEqual(['exercises[0].sets']);
  });
  it('rest_seconds inválido es error, no null silencioso', () => {
    expect(itemErrors({ rest_seconds: -1 })).toEqual(['exercises[0].rest_seconds']);
    expect(itemErrors({ rest_seconds: 'x' })).toEqual(['exercises[0].rest_seconds']);
  });
  it('rechaza suggested_kg negativo, tempo > 20, notes > 500 y order negativo', () => {
    expect(itemErrors({ suggested_kg: -5 })).toEqual(['exercises[0].suggested_kg']);
    expect(itemErrors({ tempo: 'x'.repeat(21) })).toEqual(['exercises[0].tempo']);
    expect(itemErrors({ notes: 'x'.repeat(501) })).toEqual(['exercises[0].notes']);
    expect(itemErrors({ order: -1 })).toEqual(['exercises[0].order']);
  });
  it('acepta los límites exactos', () => {
    const limits = {
      rest_seconds: 0,
      suggested_kg: 0,
      tempo: 'x'.repeat(20),
      notes: 'x'.repeat(500),
      order: 0,
    };
    expect(itemErrors(limits)).toEqual([]);
  });
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

describe('validateCreateRoutine usa el validador compartido', () => {
  it('un rest_seconds inválido ya no se pierde en silencio', () => {
    const body = {
      student_id: UUID,
      name: 'Full body',
      goal: 'hypertrophy',
      days: ['monday'],
      exercises: [{ ...OK, rest_seconds: -1 }],
    };
    expect(() => validateCreateRoutine(body)).toThrow(
      expect.objectContaining({ code: 'VALIDATION_ERROR' })
    );
  });
});
