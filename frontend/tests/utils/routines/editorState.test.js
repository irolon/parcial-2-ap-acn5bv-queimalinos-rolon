import { describe, expect, it } from 'vitest';
import {
  EMPTY_ROUTINE, fromTemplate, isBlank, moveBy, moveExercise, removeExercise,
  toggleDay, updateExercise, updateHeader,
} from '@/utils/routines/editorState';
import { EX_A, EX_B, EX_C, exercisesById, stateWith, templateFixture } from '../../helpers/routines/fixtures';

describe('editorState', () => {
  it('addExercise agrega al final con los defaults y una key única', () => {
    const state = stateWith([EX_A, EX_B]);
    expect(state.exercises.map((e) => e.exercise_id)).toEqual([EX_A, EX_B]);
    expect(state.exercises[0]).toMatchObject({
      exercise_id: EX_A, sets: '3', reps: '10', rest_seconds: '90', suggested_kg: '', tempo: '', notes: '',
    });
    expect(state.exercises[0].key).not.toBe(state.exercises[1].key);
    expect(EMPTY_ROUTINE.exercises).toEqual([]);
  });

  it('removeExercise quita por key', () => {
    const state = stateWith([EX_A, EX_B]);
    const next = removeExercise(state, state.exercises[0].key);
    expect(next.exercises.map((e) => e.exercise_id)).toEqual([EX_B]);
  });

  it('moveExercise mueve de 0 a 2', () => {
    const state = stateWith([EX_A, EX_B, EX_C]);
    expect(moveExercise(state, 0, 2).exercises.map((e) => e.exercise_id)).toEqual([EX_B, EX_C, EX_A]);
  });

  it('moveBy mueve ±1 y no se sale de los bordes', () => {
    const state = stateWith([EX_A, EX_B]);
    const [a, b] = state.exercises.map((e) => e.key);
    expect(moveBy(state, a, 1).exercises.map((e) => e.key)).toEqual([b, a]);
    expect(moveBy(state, a, -1)).toBe(state);
    expect(moveBy(state, b, 1)).toBe(state);
  });

  it('updateExercise y updateHeader actualizan un campo', () => {
    const state = stateWith([EX_A]);
    const next = updateExercise(state, state.exercises[0].key, 'reps', '12');
    expect(next.exercises[0].reps).toBe('12');
    expect(updateHeader(state, 'name', 'Otra').name).toBe('Otra');
  });

  it('toggleDay agrega y quita un día', () => {
    const on = toggleDay(EMPTY_ROUTINE, 'friday');
    expect(on.days).toEqual(['friday']);
    expect(toggleDay(on, 'friday').days).toEqual([]);
  });

  it('toggleDay mantiene los días en orden de semana', () => {
    const state = ['sunday', 'monday', 'thursday'].reduce(toggleDay, EMPTY_ROUTINE);
    expect(state.days).toEqual(['monday', 'thursday', 'sunday']);
  });

  it('fromTemplate ordena los días de la plantilla', () => {
    const template = templateFixture();
    template.structure.days = ['friday', 'monday'];
    expect(fromTemplate(template, exercisesById).state.days).toEqual(['monday', 'friday']);
  });

  it('fromTemplate precarga la plantilla y los números como string', () => {
    const { state, missing } = fromTemplate(templateFixture(), exercisesById);
    expect(missing).toBe(0);
    expect(state).toMatchObject({
      name: 'Plantilla full body', goal: 'hypertrophy', days: ['monday', 'friday'],
      templateId: 't-1', templateName: 'Plantilla full body',
    });
    expect(state.exercises[0]).toMatchObject({
      exercise_id: EX_A, sets: '4', reps: '8', rest_seconds: '60', suggested_kg: '20.5', tempo: '3-1-1', notes: 'Bajar lento',
    });
    expect(state.exercises[1]).toMatchObject({ rest_seconds: '', suggested_kg: '', tempo: '', notes: '' });
  });

  it('isBlank detecta el estado sin datos', () => {
    expect(isBlank({ ...EMPTY_ROUTINE, name: '  ' })).toBe(true);
    expect(isBlank(stateWith([]))).toBe(false);
    expect(isBlank({ ...EMPTY_ROUTINE, templateId: 't-1' })).toBe(false);
  });

  it('fromTemplate sin biblioteca no tira y descarta todo', () => {
    expect(() => fromTemplate(templateFixture())).not.toThrow();
    expect(fromTemplate(templateFixture(), new Map()).missing).toBe(2);
  });

  it('fromTemplate descarta ejercicios faltantes y los cuenta', () => {
    const template = templateFixture();
    template.structure.exercises[1].exercise = null;
    const { state, missing } = fromTemplate(template, exercisesById);
    expect(missing).toBe(1);
    expect(state.exercises).toHaveLength(1);
    expect(fromTemplate(templateFixture(), new Map([[EX_A, {}]])).missing).toBe(1);
  });
});
