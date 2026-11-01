import { describe, expect, it } from 'vitest';
import { exerciseSets, missingSets, planLoad, prefill, totals } from '@/utils/workout/workoutSets';
import { finishWorkout, removeSet, setCursor } from '@/utils/workout/workoutState';
import { routineExercise, todayRoutine } from '../../helpers/routines/studentRoutines';
import { at, freshWorkout, withSets } from '../../helpers/workout/workout';

const withKgs = (last, suggested) =>
  freshWorkout(todayRoutine({ exercises: [{ ...routineExercise({ suggested_kg: suggested }), last_session_kg: last }] }));

describe('prefill: serie 1 contra serie 2', () => {
  it('serie 1: el peso de la última sesión (62,5 sobre el sugerido 60) y las reps del plan', () => {
    expect(prefill(freshWorkout())).toEqual({ kg: 62.5, reps: 10 });
  });

  it('serie 2 en adelante: la serie anterior de ese ejercicio, aunque el plan diga otra cosa', () => {
    const state = withSets(freshWorkout(), [[0, 70, 6]]);
    expect(prefill(state)).toEqual({ kg: 70, reps: 6 });
    expect(prefill(withSets(freshWorkout(), [[0, 70, 6], [0, 72.5, 5]]))).toEqual({ kg: 72.5, reps: 5 });
  });

  it('una serie anterior a peso corporal se precarga a peso corporal', () => {
    expect(prefill(withSets(freshWorkout(), [[0, null, 15]]))).toEqual({ kg: null, reps: 15 });
  });

  it('cada ejercicio tiene la suya: las series de Press no precargan el Remo', () => {
    const state = setCursor(withSets(freshWorkout(), [[0, 70, 6]]), 1);
    expect(prefill(state)).toEqual({ kg: null, reps: 12 });
  });

  it('si se borran todas las series del ejercicio, vuelve a la serie 1 del plan', () => {
    const state = withSets(freshWorkout(), [[0, 70, 6]]);
    expect(prefill(removeSet(state, 'set-1'))).toEqual({ kg: 62.5, reps: 10 });
  });

  it.each([
    ['sin última sesión, el sugerido', null, 60, 60],
    ['última sesión en 0: el sugerido', 0, 20, 20],
    ['última sesión en 0 y sin sugerido: vacío (peso corporal)', 0, null, null],
    ['sugerido en 0 y sin historial: vacío', null, 0, null],
    ['sin ninguno: vacío', null, null, null],
  ])('serie 1 %s', (_, last, suggested, kg) => {
    expect(prefill(withKgs(last, suggested)).kg).toBe(kg);
  });

  it('sin reps en el plan, 10', () => {
    const state = freshWorkout(todayRoutine({ exercises: [routineExercise({ reps: null })] }));
    expect(prefill(state).reps).toBe(10);
  });
});

describe('planLoad', () => {
  it('es lo que el plan propone para la serie 1 ("SUGERIDO X KG × R")', () => {
    const [press, rowing] = freshWorkout().exercises;
    expect(planLoad(press)).toEqual({ kg: 62.5, reps: 10 });
    expect(planLoad(rowing)).toEqual({ kg: null, reps: 12 });
  });
});

describe('exerciseSets', () => {
  it('las series del ejercicio pedido (por defecto, el que está a la vista), por número', () => {
    const state = withSets(freshWorkout(), [[0, 60, 10], [1, 40, 12], [0, 62.5, 8]]);
    expect(exerciseSets(state, 0).map((set) => set.id)).toEqual(['set-1', 'set-3']);
    expect(exerciseSets(state).map((set) => set.id)).toEqual(['set-1', 'set-3']);
    expect(exerciseSets(state, 1).map((set) => set.id)).toEqual(['set-2']);
    expect(exerciseSets(state, 5)).toEqual([]);
  });
});

describe('missingSets', () => {
  it('lo que falta del plan: 4 + 3 sin nada registrado', () => {
    expect(missingSets(freshWorkout())).toBe(7);
  });

  it('series de más en un ejercicio no tapan las que faltan en otro', () => {
    const rows = Array.from({ length: 6 }, () => [0, 60, 10]);
    expect(missingSets(withSets(freshWorkout(), rows))).toBe(3);
    expect(missingSets(withSets(freshWorkout(), [...rows, [1, 40, 12], [1, 40, 12], [1, 40, 12]]))).toBe(0);
  });
});

describe('totals', () => {
  const done = () => withSets(freshWorkout(), [[0, 60, 10], [0, 62.5, 8], [1, null, 12], [1, 40, 0]]);

  it('series con reps > 0, volumen Σ reps × kg a 1 decimal (peso corporal = 0) y minutos hasta Terminar', () => {
    const state = finishWorkout(done(), at(54 * 60 + 20));
    expect(totals(state)).toEqual({ sets: 3, volumeKg: 1100, minutes: 54 });
  });

  it('sin terminar, los minutos van hasta `now` (redondeados, como duration_min del historial)', () => {
    expect(totals(done(), at(22 * 60 + 40)).minutes).toBe(23);
    expect(totals(freshWorkout(), at(0))).toEqual({ sets: 0, volumeKg: 0, minutes: 0 });
  });

  it('no cuenta las series que el servidor rechazó para siempre', () => {
    const state = done();
    const rejected = { ...state, upload: { ...state.upload, failed: [{ id: 'set-2', code: 'EXERCISE_NOT_FOUND' }] } };
    expect(totals(rejected, at(600))).toMatchObject({ sets: 2, volumeKg: 600 });
  });

  it('el volumen se redondea a 1 decimal', () => {
    const state = withSets(freshWorkout(), [[0, 33.33, 3]]);
    expect(totals(state, at(60)).volumeKg).toBe(100);
  });
});
