import { describe, expect, it } from '@jest/globals';
import {
  validateExerciseProgressParams,
  validateExerciseProgressQuery,
  validateBodyProgressParams,
  validateProgressOverviewQuery,
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

describe('progress.validation · query del overview', () => {
  it('query vacía y completa son válidas', () => {
    expect(validateProgressOverviewQuery({})).toEqual({});
    expect(validateProgressOverviewQuery({ student_id: ID, from: '2026-10-01', to: '2026-10-31' }))
      .toEqual({ student_id: ID, from: '2026-10-01', to: '2026-10-31' });
  });
  it('UUID o fechas inválidas → 400', () => {
    expect(failure(validateProgressOverviewQuery, { student_id: 'abc' }).fields).toEqual(['student_id']);
    expect(failure(validateProgressOverviewQuery, { from: '2026-02-30' }).fields).toEqual(['from']);
    expect(failure(validateProgressOverviewQuery, { to: '31/10/2026' }).fields).toEqual(['to']);
  });
  it('from > to → 400', () => {
    expect(failure(validateProgressOverviewQuery, { from: '2026-11-01', to: '2026-10-01' }).fields)
      .toEqual(['from']);
  });
});

describe('progress.validation · tope de rango del overview', () => {
  const now = new Date('2026-10-30T15:00:00Z');
  const run = (q) => validateProgressOverviewQuery(q, now);

  it('acepta exactamente 1095 días entre from y to', () => {
    expect(run({ from: '2023-11-01', to: '2026-10-31' })).toMatchObject({ from: '2023-11-01' });
  });
  it('from a más de 1095 días de to → 400 sobre from', () => {
    const err = (() => { try { run({ from: '2023-10-31', to: '2026-10-31' }); } catch (e) { return e; } })();
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual([{ field: 'from', message: 'El rango no puede superar 3 años' }]);
  });
  it('sin to compara contra hoy en Argentina', () => {
    expect(run({ from: '2023-10-31' })).toMatchObject({ from: '2023-10-31' });
    expect(failure(run, { from: '2023-10-29' }).fields).toEqual(['from']);
    // 01:00 UTC del 31 todavía es 30 en Argentina
    const early = new Date('2026-10-31T01:00:00Z');
    expect(validateProgressOverviewQuery({ from: '2023-10-31' }, early)).toMatchObject({ from: '2023-10-31' });
  });
  it('sin from no hay tope, y /exercise no lo aplica', () => {
    expect(run({ to: '2026-10-31' })).toEqual({ to: '2026-10-31' });
    expect(validateExerciseProgressQuery({ from: '1900-01-01' })).toEqual({ from: '1900-01-01' });
  });
});
