import {
  toTemplateSummary,
  structureFromRoutine,
  templateExerciseIds,
} from '../../../../src/models/routine-templates/routine-template.model.js';

const ex = (id) => ({ exercise_id: id, sets: 3, reps: 10 });

describe('routine-template.model', () => {
  it('toTemplateSummary expone days y exercise_count sin structure', () => {
    const row = {
      id: 't1',
      name: 'PPL',
      goal: 'strength',
      level: null,
      frequency_per_week: 2,
      generated_by_ai: false,
      created_at: 'x',
      structure: { version: 1, days: ['monday', 'friday'], exercises: [ex('a'), ex('b'), ex('c')] },
    };
    const out = toTemplateSummary(row);
    expect(out.days).toEqual(['monday', 'friday']);
    expect(out.exercise_count).toBe(3);
    expect(out.structure).toBeUndefined();
  });

  it('toTemplateSummary tolera structure vacío', () => {
    expect(toTemplateSummary({ id: 't', structure: {} })).toMatchObject({ days: [], exercise_count: 0 });
  });

  it('tolera days/exercises que no son arreglos', () => {
    const structure = { days: 'monday', exercises: 'x' };
    expect(toTemplateSummary({ id: 't', structure })).toMatchObject({ days: [], exercise_count: 0 });
    expect(templateExerciseIds(structure)).toEqual([]);
  });

  it('ignora ítems null o no objeto en exercises', () => {
    const structure = { exercises: [null, 3, ex('a')] };
    expect(toTemplateSummary({ id: 't', structure }).exercise_count).toBe(1);
    expect(templateExerciseIds(structure)).toEqual(['a']);
  });

  it('structureFromRoutine ordena por order_index y lo pasa a order', () => {
    const detail = {
      days: ['monday'],
      exercises: [
        { exercise: { id: 'b' }, sets: 3, reps: 8, rest_seconds: 60, suggested_kg: 20, tempo: '2-0-2', notes: 'n', order_index: 5 },
        { exercise: { id: 'a' }, sets: 4, reps: 6, rest_seconds: null, suggested_kg: null, tempo: null, notes: null, order_index: 1 },
      ],
    };
    const out = structureFromRoutine(detail);
    expect(out.version).toBe(1);
    expect(out.days).toEqual(['monday']);
    expect(out.exercises.map((e) => e.exercise_id)).toEqual(['a', 'b']);
    expect(out.exercises.map((e) => e.order)).toEqual([0, 1]);
    expect(out.exercises[1]).toEqual({
      exercise_id: 'b', sets: 3, reps: 8, rest_seconds: 60, suggested_kg: 20, tempo: '2-0-2', notes: 'n', order: 1,
    });
  });

  it('templateExerciseIds devuelve ids únicos', () => {
    expect(templateExerciseIds({ exercises: [ex('a'), ex('a'), ex('b')] })).toEqual(['a', 'b']);
  });
});
