import { describe, expect, it } from 'vitest';
import { finishWorkout, registerSet, removeSet, setCursor } from '@/utils/workout/workoutState';
import { at, freshWorkout, isoAt, withSets } from '../../../helpers/workout/workout';

const register = (state, load, seconds = 60) => registerSet(state, load, at(seconds), { newId: () => 'set-x' });
const numbers = (state) => state.sets.map((set) => [set.id, set.routineExerciseId, set.setNumber]);

describe('registerSet', () => {
  it('anota la serie del ejercicio a la vista con su número, peso, reps y la hora en que se hizo', () => {
    expect(register(freshWorkout(), { kg: 62.5, reps: 10 }).sets).toStrictEqual([{
      id: 'set-x',
      exerciseId: 'e-1',
      routineExerciseId: 're-1',
      setNumber: 1,
      reps: 10,
      kg: 62.5,
      executedAt: isoAt(60),
    }]);
  });

  it('arranca el descanso del ejercicio con fin absoluto: la hora de la serie + restSeconds', () => {
    expect(register(freshWorkout(), { kg: 60, reps: 10 }, 60).restEndsAt).toBe(isoAt(60 + 90));
    const rowing = setCursor(freshWorkout(), 1);
    expect(register(rowing, { kg: 40, reps: 12 }, 60).restEndsAt).toBe(isoAt(60 + 60));
  });

  it('un ejercicio con descanso de 0 s no deja ningún descanso en curso', () => {
    const state = freshWorkout();
    const noRest = { ...state, exercises: [{ ...state.exercises[0], restSeconds: 0 }, state.exercises[1]] };
    expect(register(noRest, { kg: 60, reps: 10 }).restEndsAt).toBeNull();
  });

  it('numera por ejercicio: la segunda de Press es la 2 y la primera de Remo es la 1', () => {
    const state = withSets(freshWorkout(), [[0, 60, 10], [0, 62.5, 8], [1, 40, 12]]);
    expect(numbers(state)).toEqual([['set-1', 're-1', 1], ['set-2', 're-1', 2], ['set-3', 're-2', 1]]);
    expect(state.cursor).toBe(1);
  });

  it.each([
    [null, null], ['', null], [0, null], [-5, null], ['62.5', 62.5], ['62,5', 62.5], [1500, 1000], [62.556, 62.56],
    [0.1 + 0.2, 0.3],
  ])('peso %j → %j (vacío, 0 o negativo es peso corporal; coma decimal; tope 1000 kg y 2 decimales)', (kg, expected) => {
    expect(register(freshWorkout(), { kg, reps: 10 }).sets[0].kg).toBe(expected);
  });

  it.each(['abc', '62,5 kg', '1.000,5', Number.NaN, true])('peso ilegible %j: no registra nada (como reps inválidas)', (kg) => {
    const state = freshWorkout();
    expect(register(state, { kg, reps: 10 })).toBe(state);
  });

  it.each([[10, 10], ['8', 8], [7.6, 8], [0, 0], [-3, 0], [1500, 1000]])('reps %j → %j', (reps, expected) => {
    expect(register(freshWorkout(), { kg: 60, reps }).sets[0].reps).toBe(expected);
  });

  it.each([null, undefined, '', 'diez', Number.NaN])('reps %j no es un número: no registra nada', (reps) => {
    const state = freshWorkout();
    expect(register(state, { kg: 60, reps })).toBe(state);
  });

  it('no pasa de 100 series en un ejercicio (el backend rechazaría la 101 para siempre)', () => {
    const state = withSets(freshWorkout(), Array.from({ length: 100 }, () => [0, 60, 10]));
    expect(state.sets).toHaveLength(100);
    expect(register(state, { kg: 60, reps: 10 })).toBe(state);
  });

  it('con la sesión terminada no registra', () => {
    const finished = finishWorkout(freshWorkout(), at(30));
    expect(register(finished, { kg: 60, reps: 10 })).toBe(finished);
  });

  it('no modifica el estado que recibe', () => {
    const state = freshWorkout();
    const before = JSON.stringify(state);
    register(state, { kg: 60, reps: 10 });
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('removeSet', () => {
  const threePress = () => withSets(freshWorkout(), [[0, 60, 10], [1, 40, 12], [0, 62.5, 8], [0, 65, 6]]);

  it('borra la serie y renumera su ejercicio: si se borra la 2 de 3, la 3 pasa a ser la 2', () => {
    const state = removeSet(threePress(), 'set-3');
    expect(numbers(state)).toEqual([['set-1', 're-1', 1], ['set-2', 're-2', 1], ['set-4', 're-1', 2]]);
    expect(state.sets.find((set) => set.id === 'set-4')).toMatchObject({ kg: 65, reps: 6, executedAt: isoAt(240) });
  });

  it('borrar la primera corre todas las de ese ejercicio y no toca las del otro', () => {
    const before = threePress();
    const state = removeSet(before, 'set-1');
    expect(numbers(state)).toEqual([['set-2', 're-2', 1], ['set-3', 're-1', 1], ['set-4', 're-1', 2]]);
    expect(state.sets[0]).toBe(before.sets[1]);
  });

  it('un id que no existe o la sesión terminada dejan el estado igual', () => {
    const state = threePress();
    expect(removeSet(state, 'no-existe')).toBe(state);
    const finished = finishWorkout(state, at(600));
    expect(removeSet(finished, 'set-1')).toBe(finished);
  });
});

describe('setCursor', () => {
  it('pone a la vista el ejercicio pedido y lo recorta al rango', () => {
    const state = freshWorkout();
    expect(setCursor(state, 1).cursor).toBe(1);
    expect(setCursor(state, 9).cursor).toBe(1);
    expect(setCursor(setCursor(state, 1), -1).cursor).toBe(0);
  });

  it('ignora lo que no es un índice entero y no cambia nada si ya está ahí', () => {
    const state = freshWorkout();
    expect(setCursor(state, 0)).toBe(state);
    expect(setCursor(state, 0.5)).toBe(state);
    expect(setCursor(state, '1')).toBe(state);
  });
});
