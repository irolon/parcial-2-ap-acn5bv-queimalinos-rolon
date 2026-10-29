import {
  durationMin,
  summarizeSets,
  toSessionSummary,
  groupSetsByExercise,
} from '../../../../src/models/sessions/session-history.model.js';

const set = (o) => ({ completed: true, actual_reps: 10, actual_kg: 50, ...o });

describe('durationMin', () => {
  it('calcula minutos enteros', () => {
    expect(durationMin('2026-10-01T10:00:00Z', '2026-10-01T10:54:00Z')).toBe(54);
  });
  it('null si no se cerró', () => {
    expect(durationMin('2026-10-01T10:00:00Z', null)).toBeNull();
  });
  it('redondea', () => {
    expect(durationMin('2026-10-01T10:00:00Z', '2026-10-01T10:00:40Z')).toBe(1);
    expect(durationMin('2026-10-01T10:00:00Z', '2026-10-01T10:00:20Z')).toBe(0);
  });
});

describe('summarizeSets', () => {
  it('ignora no completadas y 0 reps', () => {
    const r = summarizeSets([set({}), set({ completed: false }), set({ actual_reps: 0 })]);
    expect(r).toEqual({ sets: 1, volume_kg: 500 });
  });
  it('kg nulo suma 0 pero la serie cuenta', () => {
    expect(summarizeSets([set({ actual_kg: null }), set({})])).toEqual({ sets: 2, volume_kg: 500 });
  });
  it('redondea a 1 decimal y coerciona strings', () => {
    expect(summarizeSets([set({ actual_reps: '3', actual_kg: '10.33' })]).volume_kg).toBe(31);
  });
  it('vacío', () => {
    expect(summarizeSets([])).toEqual({ sets: 0, volume_kg: 0 });
  });
});

describe('toSessionSummary', () => {
  const row = {
    id: 's1',
    started_at: '2026-10-01T10:00:00Z',
    finished_at: '2026-10-01T11:00:00Z',
    rpe: 8,
    notes: 'ok',
    trainer_comment: 'Bien',
    has_modifications: false,
    routine: { id: 'r1', name: 'Push', extra: 1 },
  };
  it('arma el resumen', () => {
    const s = toSessionSummary(row, { sets: [set({})], recordsBySession: new Set(['s1']) });
    expect(s).toEqual({
      id: 's1',
      started_at: row.started_at,
      finished_at: row.finished_at,
      duration_min: 60,
      routine: { id: 'r1', name: 'Push' },
      rpe: 8,
      notes: 'ok',
      trainer_comment: 'Bien',
      has_modifications: false,
      sets: 1,
      volume_kg: 500,
      has_pr: true,
    });
  });
  it('routine null, sin récords y comentario ausente -> null', () => {
    const { routine, trainer_comment, ...rest } = row;
    const s = toSessionSummary(rest, { sets: [], recordsBySession: new Set() });
    expect(s.routine).toBeNull();
    expect(s.has_pr).toBe(false);
    expect(s.trainer_comment).toBeNull();
  });
});

describe('groupSetsByExercise', () => {
  const exercisesById = new Map([
    ['e1', { id: 'e1', name: 'Press' }],
    ['e2', { id: 'e2', name: 'Mancuernas' }],
    ['e3', { id: 'e3', name: 'Sentadilla' }],
  ]);
  const base = {
    completed: true,
    actual_reps: 10,
    actual_kg: 60,
    original_exercise_id: null,
    routine_exercise_id: null,
  };
  const sub = { exercise_id: 'e1', original_exercise_id: 'e2', routine_exercise_id: 're1' };
  const sets = [
    { ...base, id: 'a', exercise_id: 'e3', set_number: 1, executed_at: '2026-10-01T10:30:00Z' },
    { ...base, ...sub, id: 'b', set_number: 2, executed_at: '2026-10-01T10:10:00Z' },
    { ...base, ...sub, id: 'c', set_number: 1, executed_at: '2026-10-01T10:05:00Z' },
  ];
  const ctx = {
    exercisesById,
    plannedByRoutineExercise: new Map([['re1', { sets: 4, reps: '10', suggested_kg: '60', x: 1 }]]),
    recordExerciseIds: new Set(['e1']),
  };
  it('agrupa, ordena por primer executed_at y arma la forma', () => {
    const r = groupSetsByExercise(sets, ctx);
    expect(r.map((g) => g.exercise.id)).toEqual(['e1', 'e3']);
    expect(r[0].original_exercise).toEqual({ id: 'e2', name: 'Mancuernas' });
    expect(r[0].planned).toEqual({ sets: 4, reps: 10, suggested_kg: 60 });
    expect(r[0].is_pr).toBe(true);
    expect(r[0].sets.map((s) => s.id)).toEqual(['c', 'b']);
    expect(r[0].sets[0]).toEqual({
      id: 'c',
      set_number: 1,
      actual_reps: 10,
      actual_kg: 60,
      completed: true,
      executed_at: sets[2].executed_at,
    });
  });
  it('sin sustitución ni enlace: original_exercise y planned null; is_pr false', () => {
    const g = groupSetsByExercise(sets, ctx)[1];
    expect(g.exercise).toEqual({ id: 'e3', name: 'Sentadilla' });
    expect(g.original_exercise).toBeNull();
    expect(g.planned).toBeNull();
    expect(g.is_pr).toBe(false);
  });
  it('mismo ejercicio con distinto original va en grupos separados', () => {
    const extra = { ...base, id: 'd', exercise_id: 'e1', set_number: 3, executed_at: '2026-10-01T10:40:00Z' };
    expect(groupSetsByExercise([...sets, extra], ctx)).toHaveLength(3);
  });
});
