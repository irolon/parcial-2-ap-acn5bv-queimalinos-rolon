import {
  toTemplateSummary,
  structureFromRoutine,
  templateExerciseIds,
} from '../../../../src/models/routine-templates/routine-template.model.js';

const ex = (id) => ({ exercise_id: id, sets: 3, reps: 10 });

describe('routine-template.model', () => {
  // Fila de la vista routine_templates_summary (days y exercise_count ya calculados en la base).
  const summaryRow = {
    id: 't1',
    trainer_id: 'tr-1',
    name: 'PPL',
    goal: 'strength',
    level: null,
    frequency_per_week: 2,
    generated_by_ai: false,
    created_at: '2026-11-14T10:00:00+00:00',
    days: ['monday', 'friday'],
    exercise_count: 3,
  };

  it('toTemplateSummary devuelve la misma forma de siempre: mismas claves, mismo orden, sin trainer_id', () => {
    const out = toTemplateSummary(summaryRow);
    expect(Object.keys(out)).toEqual([
      'id', 'name', 'goal', 'level', 'frequency_per_week', 'generated_by_ai', 'created_at', 'days', 'exercise_count',
    ]);
    expect(JSON.stringify(out)).toBe(
      '{"id":"t1","name":"PPL","goal":"strength","level":null,"frequency_per_week":2,"generated_by_ai":false,' +
        '"created_at":"2026-11-14T10:00:00+00:00","days":["monday","friday"],"exercise_count":3}'
    );
  });

  it('toTemplateSummary respeta el orden de days tal como viene de la structure', () => {
    const out = toTemplateSummary({ ...summaryRow, days: ['friday', 'monday', 'wednesday'] });
    expect(out.days).toEqual(['friday', 'monday', 'wednesday']);
  });

  it('toTemplateSummary nunca devuelve structure aunque la fila la traiga', () => {
    expect(toTemplateSummary({ ...summaryRow, structure: { days: [] } }).structure).toBeUndefined();
  });

  it('tolera days/exercises que no son arreglos', () => {
    expect(templateExerciseIds({ days: 'monday', exercises: 'x' })).toEqual([]);
  });

  it('ignora ítems null o no objeto en exercises', () => {
    expect(templateExerciseIds({ exercises: [null, 3, ex('a')] })).toEqual(['a']);
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
