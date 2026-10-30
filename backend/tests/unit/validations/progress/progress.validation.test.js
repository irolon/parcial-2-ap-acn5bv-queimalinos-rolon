import { describe, expect, it } from '@jest/globals';
import {
  validateExerciseProgressParams,
  validateExerciseProgressQuery,
  validateBodyProgressParams,
} from '../../../../src/validations/progress/progress.validation.js';

const ID = '44444444-4444-4444-8444-444444444444';
const failure = (fn, input) => {
  try {
    fn(input);
  } catch (e) {
    return { code: e.code, fields: e.details.map((d) => d.field) };
  }
  return null;
};

describe('progress.validation · params', () => {
  it('exerciseId UUID válido (se pasa a minúscula)', () => {
    expect(validateExerciseProgressParams({ exerciseId: ID.toUpperCase() })).toEqual({ exerciseId: ID });
  });
  it('exerciseId inválido → 400', () => {
    expect(failure(validateExerciseProgressParams, { exerciseId: 'x' }))
      .toEqual({ code: 'VALIDATION_ERROR', fields: ['exerciseId'] });
  });
  it('studentId UUID válido / inválido', () => {
    expect(validateBodyProgressParams({ studentId: ID })).toEqual({ studentId: ID });
    expect(failure(validateBodyProgressParams, { studentId: '1' }).fields).toEqual(['studentId']);
  });
});

describe('progress.validation · query', () => {
  it('query vacía es válida', () => {
    expect(validateExerciseProgressQuery({})).toEqual({});
  });
  it('acepta student_id, from y to', () => {
    expect(validateExerciseProgressQuery({ student_id: ID, from: '2026-10-01', to: '2026-10-31' }))
      .toEqual({ student_id: ID, from: '2026-10-01', to: '2026-10-31' });
  });
  it('from igual a to es válido', () => {
    expect(validateExerciseProgressQuery({ from: '2026-10-01', to: '2026-10-01' }))
      .toMatchObject({ from: '2026-10-01' });
  });
  it('fecha inexistente (2026-02-30) → 400', () => {
    expect(failure(validateExerciseProgressQuery, { from: '2026-02-30' }).fields).toEqual(['from']);
  });
  it('formato inválido → 400', () => {
    expect(failure(validateExerciseProgressQuery, { to: '31/10/2026' }).fields).toEqual(['to']);
    expect(failure(validateExerciseProgressQuery, { to: ['2026-10-01'] }).fields).toEqual(['to']);
  });
  it('from > to → 400', () => {
    expect(failure(validateExerciseProgressQuery, { from: '2026-11-01', to: '2026-10-01' }).fields)
      .toEqual(['from']);
  });
  it('student_id inválido → 400', () => {
    expect(failure(validateExerciseProgressQuery, { student_id: 'abc' }).fields).toEqual(['student_id']);
  });
});
