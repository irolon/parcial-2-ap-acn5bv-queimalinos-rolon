import { describe, it, expect } from '@jest/globals';
import { pickWorkingRoutine, toTodaysRoutine, routineExerciseIds } from '../../../../src/models/chat/todays-routine.model.js';

const re = (order_index, exercise_id) => ({
  order_index, exercise_id, sets: 4, reps: '8-10', suggested_kg: 50, notes: 'secreto',
  exercise: { id: exercise_id, name: `Ejercicio ${exercise_id}`, muscle_group: 'chest', equipment: 'barbell', video_url: null },
});
const routine = (name, ...ids) => ({ name, routine_exercises: ids.map((id, i) => re(i + 1, id)) });

const TODAY = routine('hoy', 'a', 'b');
const OLD = routine('vieja', 'c');
const NEWER = routine('nueva', 'c', 'd');

describe('chat · todays-routine.model · pickWorkingRoutine', () => {
  it('la de hoy contiene el ejercicio → la de hoy', () => {
    expect(pickWorkingRoutine({ today: TODAY, active: [NEWER, TODAY], currentExerciseId: 'a' })).toBe(TODAY);
  });

  it('la de hoy no lo contiene y otra activa sí → la primera activa que lo contiene', () => {
    expect(pickWorkingRoutine({ today: TODAY, active: [NEWER, OLD], currentExerciseId: 'c' })).toBe(NEWER);
  });

  it('ninguna lo contiene → la de hoy', () => {
    expect(pickWorkingRoutine({ today: TODAY, active: [OLD], currentExerciseId: 'zzz' })).toBe(TODAY);
  });

  it('sin currentExerciseId → la de hoy', () => {
    expect(pickWorkingRoutine({ today: TODAY, active: [OLD], currentExerciseId: null })).toBe(TODAY);
  });

  it('sin la de hoy y sin coincidencias → null', () => {
    expect(pickWorkingRoutine({ today: null, active: [OLD], currentExerciseId: 'zzz' })).toBeNull();
    expect(pickWorkingRoutine({ today: null, active: [], currentExerciseId: null })).toBeNull();
  });
});

describe('chat · todays-routine.model · toTodaysRoutine', () => {
  it('ordena por order_index, marca solo el ejercicio actual y no trae name ni notes', () => {
    const shuffled = { name: 'reservada', routine_exercises: [re(2, 'b'), re(1, 'a'), re(3, 'c')] };
    const result = toTodaysRoutine(shuffled, 'b');
    expect(result.map((e) => e.exercise_name)).toEqual(['Ejercicio a', 'Ejercicio b', 'Ejercicio c']);
    expect(result.map((e) => e.is_current)).toEqual([false, true, false]);
    expect(result[0]).toEqual({
      exercise_name: 'Ejercicio a', muscle_group: 'chest', sets: 4, reps: '8-10', suggested_kg: 50, is_current: false,
    });
    const sent = JSON.stringify(result);
    expect(sent).not.toContain('reservada');
    expect(sent).not.toContain('secreto');
  });

  it('sin ejercicio actual todos van con is_current false', () => {
    expect(toTodaysRoutine(TODAY, null).every((e) => e.is_current === false)).toBe(true);
  });

  it('sin rutina → null', () => {
    expect(toTodaysRoutine(null, 'a')).toBeNull();
  });
});

describe('chat · todays-routine.model · routineExerciseIds', () => {
  it('los exercise_id de la rutina', () => {
    expect(routineExerciseIds(TODAY)).toEqual(['a', 'b']);
  });
});
