import { describe, expect, it } from 'vitest';
import { fromRoutine, libraryWith, snapshotOf, withSavedIds } from '@/utils/routines/edit/fromRoutine';
import { EX_A, EX_B, EX_C } from '../../../helpers/routines/fixtures';
import { RE_A, RE_B, detailExercise, routineDetail } from '../../../helpers/routines/routineDetail';

describe('fromRoutine', () => {
  it('arma el estado del editor con la cabecera y los ejercicios en orden, como texto y con su id de fila', () => {
    const detail = routineDetail({
      days: ['thursday', 'monday'],
      exercises: [detailExercise(RE_B, EX_B, 1), detailExercise(RE_A, EX_A, 0, { tempo: '3-1-1' })],
    });
    const state = fromRoutine(detail);
    expect(state).toMatchObject({ name: 'Fuerza A', goal: 'strength', level: 'beginner', days: ['monday', 'thursday'] });
    expect(state.templateId).toBeNull();
    expect(state.exercises.map((e) => e.routineExerciseId)).toEqual([RE_A, RE_B]);
    expect(state.exercises[0]).toMatchObject({
      exercise_id: EX_A, sets: '4', reps: '8', rest_seconds: '90', suggested_kg: '60', tempo: '3-1-1', notes: '',
    });
    expect(state.exercises[0].key).not.toBe(state.exercises[1].key);
  });

  it('sin nivel queda en "" (sin definir) y sin días, vacío', () => {
    const state = fromRoutine(routineDetail({ level: null, days: null }));
    expect(state.level).toBe('');
    expect(state.days).toEqual([]);
  });
});

describe('snapshotOf', () => {
  it('es igual para la misma rutina aunque cambie el orden de llegada o la fecha', () => {
    const a = routineDetail();
    const b = { ...routineDetail(), created_at: 'otra', exercises: [...routineDetail().exercises].reverse() };
    expect(snapshotOf(a)).toBe(snapshotOf(b));
  });

  it('cambia si cambia la cabecera, un valor, el orden o el ejercicio de una fila', () => {
    const base = snapshotOf(routineDetail());
    expect(snapshotOf(routineDetail({ name: 'Otra' }))).not.toBe(base);
    const values = routineDetail();
    values.exercises[0].reps = 12;
    expect(snapshotOf(values)).not.toBe(base);
    const order = routineDetail({ exercises: [detailExercise(RE_A, EX_A, 1), detailExercise(RE_B, EX_B, 0)] });
    expect(snapshotOf(order)).not.toBe(base);
    const swapped = routineDetail();
    swapped.exercises[0] = detailExercise(RE_A, EX_C, 0);
    expect(snapshotOf(swapped)).not.toBe(base);
  });
});

describe('libraryWith', () => {
  it('suma a la biblioteca los ejercicios de la rutina que no están (sin pisar los que sí)', () => {
    const library = new Map([[EX_A, { id: EX_A, name: 'Sentadilla de la biblioteca' }]]);
    const merged = libraryWith(library, routineDetail());
    expect(merged.get(EX_A).name).toBe('Sentadilla de la biblioteca');
    expect(merged.get(EX_B).name).toBe('Remo');
    expect(library.has(EX_B)).toBe(false);
  });
});

describe('withSavedIds', () => {
  it('anota en cada fila el id de fila que le dio el servidor', () => {
    const state = fromRoutine(routineDetail());
    const [first, second] = state.exercises;
    const next = withSavedIds(state, new Map([[second.key, 'nuevo']]));
    expect(next.exercises.map((e) => e.routineExerciseId)).toEqual([first.routineExerciseId, 'nuevo']);
    expect(withSavedIds(state, new Map())).toBe(state);
  });
});
