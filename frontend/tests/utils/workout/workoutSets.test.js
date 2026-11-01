import { describe, expect, it } from 'vitest';
import * as sets from '@/utils/workout/workoutSets';
import * as workoutState from '@/utils/workout/workoutState';
import { routineExercise, todayRoutine } from '../../helpers/routines/studentRoutines';
import { at, freshWorkout, withSets } from '../../helpers/workout/workout';

const { exerciseSets, missingSets, planLoad, prefill, toSetKg, toSetReps, totals } = sets;
const { finishWorkout, removeSet, setCursor } = workoutState;

const withKgs = (last, suggested) =>
  freshWorkout(todayRoutine({ exercises: [{ ...routineExercise({ suggested_kg: suggested }), last_session_kg: last }] }));

describe('toSetKg: el peso como lo carga el alumno', () => {
  it.each([
    [62.5, 62.5], ['62.5', 62.5], ['62,5', 62.5], [' 62,5 ', 62.5], ['62,', 62], [',5', 0.5], ['72,556', 72.56],
    [1000, 1000], ['1000', 1000],
    ['1.000', 1], // sin separador de miles: un solo separador y es el decimal
  ])('%j → %j', (value, expected) => {
    expect(toSetKg(value)).toBe(expected);
  });

  it.each([null, undefined, '', '   ', 0, '0', '0,0', -5, '-2,5'])('%j es peso corporal (null)', (value) => {
    expect(toSetKg(value)).toBeNull();
  });

  it.each(['abc', '62,5 kg', '1.000,5', '6,2,5', '--5', Number.NaN, Number.POSITIVE_INFINITY, true, {}, 1000.01, '1250'])(
    '%j es ilegible o pasa de 1000 kg: NaN (la serie no se registra)',
    (value) => {
      expect(toSetKg(value)).toBeNaN();
    },
  );

  it('toSetReps: entero de 0 a 1000; lo que no es número, null', () => {
    expect([toSetReps('8'), toSetReps(7.6), toSetReps(-3), toSetReps(1500)]).toEqual([8, 8, 0, 1000]);
    expect([toSetReps('8,5'), toSetReps(''), toSetReps(null)]).toEqual([null, null, null]);
  });
});

describe('workoutState es la única puerta para las páginas', () => {
  it.each(['exerciseSets', 'planLoad', 'prefill', 'missingSets', 'totals', 'toSetKg', 'toSetReps'])(
    're-exporta %s de workoutSets',
    (name) => {
      expect(workoutState[name]).toBe(sets[name]);
    },
  );
});

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

  it('un peso del plan de más de 1000 kg se propone en 1000 (no es lo que cargó el alumno)', () => {
    const [press] = freshWorkout(todayRoutine({ exercises: [{ ...routineExercise({ suggested_kg: 1500 }), last_session_kg: null }] })).exercises;
    expect(planLoad(press).kg).toBe(1000);
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
