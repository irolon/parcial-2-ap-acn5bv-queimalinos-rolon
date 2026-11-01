import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finishWorkout, setFeedback } from '@/utils/workout/workoutState';
import {
  clearWorkout, isWorkout, loadWorkout, saveWorkout, studentOfKey, workoutKey,
} from '@/utils/workout/workoutStorage';
import { at, freshWorkout, withSets } from '../../helpers/workout/workout';

// Una sesión con todo: series de dos ejercicios, el Remo a la vista, descanso corriendo, feedback y subida a medias.
function midSession() {
  const state = withSets(freshWorkout(), [[0, 60, 10], [0, null, 12], [1, 40.5, 8]]);
  const upload = {
    sessionCreated: true,
    sentSetIds: ['set-1'],
    failed: [{ id: 'set-2', code: 'EXERCISE_NOT_FOUND' }],
    unlocked: [{ code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' }],
  };
  return { ...setFeedback(finishWorkout(state, at(900)), { rpe: 8, notes: 'Bien' }), upload };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('workoutStorage', () => {
  it('Review Focus 2: guardar y volver a leer da exactamente el mismo estado', () => {
    const state = midSession();
    expect(saveWorkout('s-1', state)).toBe(true);
    expect(loadWorkout('s-1')).toStrictEqual(state);
    const running = withSets(freshWorkout(), [[0, 60, 10]]);
    saveWorkout('s-1', running);
    expect(loadWorkout('s-1')).toStrictEqual(running);
  });

  it('guarda una sesión por alumno en ft.workout.<id>', () => {
    saveWorkout('s-1', freshWorkout());
    expect(workoutKey('s-1')).toBe('ft.workout.s-1');
    expect(JSON.parse(localStorage.getItem('ft.workout.s-1')).id).toBe('session-1');
    expect(loadWorkout('s-2')).toBeNull();
  });

  it('clearWorkout borra solo la del alumno', () => {
    saveWorkout('s-1', freshWorkout());
    saveWorkout('s-2', freshWorkout());
    expect(clearWorkout('s-1')).toBe(true);
    expect(loadWorkout('s-1')).toBeNull();
    expect(loadWorkout('s-2')).not.toBeNull();
  });

  it('lo que no es una sesión válida (JSON roto, otra forma) se lee como null', () => {
    localStorage.setItem('ft.workout.s-1', '{roto');
    expect(loadWorkout('s-1')).toBeNull();
    localStorage.setItem('ft.workout.s-1', JSON.stringify({ id: 'x', sets: [] }));
    expect(loadWorkout('s-1')).toBeNull();
    const { upload, ...withoutUpload } = freshWorkout();
    expect(upload).toBeDefined();
    expect(isWorkout(withoutUpload)).toBe(false);
    expect(isWorkout({ ...freshWorkout(), exercises: [] })).toBe(false);
    expect(isWorkout(freshWorkout())).toBe(true);
  });

  it('un cursor fuera de rango no es una sesión: 99, negativo, decimal o igual a la cantidad de ejercicios', () => {
    [99, -1, 1.5, 2, Number.NaN, '1', null].forEach((cursor) => expect(isWorkout({ ...freshWorkout(), cursor })).toBe(false));
    [0, 1].forEach((cursor) => expect(isWorkout({ ...freshWorkout(), cursor })).toBe(true));
  });

  it('guardada a mano con el cursor en 99 se lee como sin sesión (la pantalla no la recibe)', () => {
    localStorage.setItem('ft.workout.s-1', JSON.stringify({ ...freshWorkout(), cursor: 99 }));
    expect(loadWorkout('s-1')).toBeNull();
  });

  it('un ejercicio sin la forma que lee la pantalla (ids, nombre, series, reps o descanso) no es una sesión', () => {
    const [press] = freshWorkout().exercises;
    const withExercise = (change) => ({ ...freshWorkout(), exercises: [{ ...press, ...change }] });
    const broken = [
      { routineExerciseId: undefined }, { routineExerciseId: 5 }, { exerciseId: null }, { name: undefined }, { name: 7 },
      { sets: '4' }, { sets: 0 }, { sets: 2.5 }, { reps: null }, { reps: -1 }, { restSeconds: undefined }, { restSeconds: -5 },
    ];
    broken.forEach((change) => expect(isWorkout(withExercise(change)), JSON.stringify(change)).toBe(false));
    expect(isWorkout({ ...freshWorkout(), exercises: [null] })).toBe(false);
    expect(isWorkout({ ...freshWorkout(), exercises: [press, 'x'] })).toBe(false);
  });

  it('sin peso en el plan (null) o sin descanso (0) sigue siendo una sesión', () => {
    const [press] = freshWorkout().exercises;
    const quiet = { ...press, suggestedKg: null, lastKg: null, restSeconds: 0, reps: 0 };
    expect(isWorkout({ ...freshWorkout(), exercises: [quiet] })).toBe(true);
  });

  it('si localStorage falla (modo privado, cuota, bloqueado), no tira: null y false', () => {
    const boom = () => { throw new DOMException('bloqueado', 'SecurityError'); };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
    expect(loadWorkout('s-1')).toBeNull();
    expect(saveWorkout('s-1', freshWorkout())).toBe(false);
    expect(clearWorkout('s-1')).toBe(false);
  });

  it('sin alumno no lee ni escribe nada', () => {
    expect(saveWorkout(undefined, freshWorkout())).toBe(false);
    expect(saveWorkout('', freshWorkout())).toBe(false);
    expect(loadWorkout(null)).toBeNull();
    expect(clearWorkout(null)).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it('studentOfKey reconoce las claves de sesión', () => {
    expect(studentOfKey('ft.workout.s-1')).toBe('s-1');
    expect(studentOfKey('fittrainer.session')).toBeNull();
    expect(studentOfKey(null)).toBeNull();
  });
});
