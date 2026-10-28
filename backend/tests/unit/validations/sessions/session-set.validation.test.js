import { parseSet } from '../../../../src/validations/sessions/sessions.validation.js';

const U1 = '3f1c2b9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c';
const U2 = '4a2d3c0b-2e3f-4a6b-9c8d-0e1f2a3b4c5d';
const base = {
  id: U1, exercise_id: U2, set_number: 1, actual_reps: 10, actual_kg: 40,
  executed_at: '2026-10-17T09:10:00-03:00',
};
const badField = (patch, field) => {
  const r = parseSet({ ...base, ...patch });
  expect(r.ok).toBe(false);
  expect(r.details.map((d) => d.field)).toContain(field);
};

describe('sessions.validation — parseSet', () => {
  it('válido: completed true por defecto y nulls en opcionales', () => {
    expect(parseSet(base)).toEqual({
      ok: true,
      value: {
        id: U1, exercise_id: U2, original_exercise_id: null, routine_exercise_id: null,
        set_number: 1, actual_reps: 10, actual_kg: 40, completed: true,
        executed_at: '2026-10-17T09:10:00-03:00',
      },
    });
  });

  it('ids en minúscula, reps 0 y kg null ok, futuro ok', () => {
    const r = parseSet({
      ...base, id: U1.toUpperCase(), original_exercise_id: U1.toUpperCase(),
      routine_exercise_id: U2.toUpperCase(), actual_reps: 0, actual_kg: null,
      completed: false, executed_at: '2999-01-01T00:00:00Z',
    });
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({
      id: U1, original_exercise_id: U1, routine_exercise_id: U2,
      actual_reps: 0, actual_kg: null, completed: false,
    });
  });

  it('rechaza valores inválidos indicando el campo', () => {
    badField({ id: 'x' }, 'id');
    badField({ exercise_id: undefined }, 'exercise_id');
    badField({ set_number: 0 }, 'set_number');
    badField({ actual_reps: 2.5 }, 'actual_reps');
    badField({ actual_reps: -1 }, 'actual_reps');
    badField({ actual_kg: -1 }, 'actual_kg');
    badField({ completed: 'si' }, 'completed');
    badField({ executed_at: '2026-02-30T10:00:00Z' }, 'executed_at');
    badField({ executed_at: undefined }, 'executed_at');
    badField({ original_exercise_id: 'x' }, 'original_exercise_id');
    expect(parseSet(null).ok).toBe(false);
  });
});
