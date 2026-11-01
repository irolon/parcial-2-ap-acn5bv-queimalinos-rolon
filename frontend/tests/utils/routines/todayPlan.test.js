import { describe, expect, it } from 'vitest';
import {
  estimatedMinutes, exerciseCount, planRows, planSummary, totalSets, withLastSessionKg,
} from '@/utils/routines/todayPlan';
import { mineRoutine, routineExercise, todayRoutine } from '../../helpers/routines/studentRoutines';

const exercise = (overrides = {}) => ({ ...routineExercise(), last_session_kg: null, ...overrides });

describe('estimatedMinutes', () => {
  it('suma series × (descanso + 45 s) y lo pasa a minutos redondeados', () => {
    const exercises = [
      exercise({ sets: 4, rest_seconds: 90 }), // 4 × 135 = 540 s
      exercise({ sets: 3, rest_seconds: 60 }), // 3 × 105 = 315 s
      exercise({ sets: 3, rest_seconds: 0 }), //  3 × 45  = 135 s
    ];
    expect(estimatedMinutes(exercises)).toBe(17); // 990 s = 16,5 min
  });

  it('redondea al minuto más cercano', () => {
    expect(estimatedMinutes([exercise({ sets: 6, rest_seconds: 55 })])).toBe(10); // 600 s
    expect(estimatedMinutes([exercise({ sets: 1, rest_seconds: 20 })])).toBe(1); // 65 s
    expect(estimatedMinutes([exercise({ sets: 1, rest_seconds: 0 })])).toBe(1); // 45 s: no baja a 0
  });

  it('sin ejercicios son 0 minutos', () => {
    expect(estimatedMinutes([])).toBe(0);
    expect(estimatedMinutes()).toBe(0);
  });

  it('un descanso o unas series que la rutina no trae usan los valores por defecto (90 s y 3 series)', () => {
    expect(estimatedMinutes([exercise({ sets: 2, rest_seconds: null })])).toBe(5); // 2 × 135 = 270 s
    expect(estimatedMinutes([exercise({ sets: null, rest_seconds: 60 })])).toBe(5); // 3 × 105 = 315 s
  });

  it('el descanso en 0 cuenta como 0, no como el valor por defecto', () => {
    expect(estimatedMinutes([exercise({ sets: 4, rest_seconds: 0 })])).toBe(3); // 4 × 45 = 180 s
  });
});

describe('totalSets', () => {
  it('suma las series de todos los ejercicios', () => {
    expect(totalSets([exercise({ sets: 4 }), exercise({ sets: 3 }), exercise({ sets: 5 })])).toBe(12);
  });

  it('una rutina sin series cargadas usa 3 por ejercicio, igual que la sesión', () => {
    expect(totalSets([exercise({ sets: null }), exercise({ sets: 2 })])).toBe(5);
  });

  it('sin ejercicios son 0', () => {
    expect(totalSets([])).toBe(0);
    expect(totalSets()).toBe(0);
  });
});

describe('planRows', () => {
  it('arma una fila por ejercicio, en el orden recibido y numeradas desde 1', () => {
    const rows = planRows([
      exercise({ routine_exercise_id: 're-a', exercise: { id: 'e-a', name: 'Sentadilla' } }),
      exercise({ routine_exercise_id: 're-b', exercise: { id: 'e-b', name: 'Remo' } }),
    ]);
    expect(rows.map((r) => [r.position, r.id, r.name])).toEqual([
      [1, 're-a', 'Sentadilla'],
      [2, 're-b', 'Remo'],
    ]);
  });

  it('muestra series × reps', () => {
    const [row] = planRows([exercise({ sets: 4, reps: 10 })]);
    expect(row.setsReps).toBe('4 × 10');
  });

  it('el peso sugerido es el de la última sesión y, si no hay, el que dejó el entrenador', () => {
    const rows = planRows([
      exercise({ last_session_kg: 62.5, suggested_kg: 60 }),
      exercise({ last_session_kg: null, suggested_kg: 60 }),
      exercise({ last_session_kg: 70, suggested_kg: null }),
    ]);
    expect(rows.map((r) => r.suggestedKg)).toEqual([62.5, 60, 70]);
    expect(rows.map((r) => r.suggestedLabel)).toEqual(['62,5 kg', '60 kg', '70 kg']);
  });

  it('sin ningún peso muestra "—"', () => {
    const [row] = planRows([exercise({ last_session_kg: null, suggested_kg: null })]);
    expect(row.suggestedKg).toBeNull();
    expect(row.suggestedLabel).toBe('—');
  });

  // 0 kg es "sin peso" (peso corporal): el celular guarda 0 cuando no hay sugerido ni historial.
  it.each([
    ['una última sesión en 0 no tapa al sugerido', { last_session_kg: 0, suggested_kg: 20 }, 20, '20 kg'],
    ['una última sesión en 0 y sin sugerido no tiene peso', { last_session_kg: 0, suggested_kg: null }, null, '—'],
    ['un sugerido en 0 y sin última sesión no tiene peso', { last_session_kg: null, suggested_kg: 0 }, null, '—'],
    ['los dos en 0 no tienen peso', { last_session_kg: 0, suggested_kg: 0 }, null, '—'],
  ])('%s', (_, weights, kg, label) => {
    const [row] = planRows([exercise(weights)]);
    expect(row.suggestedKg).toBe(kg);
    expect(row.suggestedLabel).toBe(label);
  });

  it('las series o reps que la rutina no trae salen con los valores por defecto (3 × 10)', () => {
    const [row] = planRows([exercise({ sets: null, reps: null })]);
    expect(row.setsReps).toBe('3 × 10');
  });

  it('un ejercicio sin datos del ejercicio no rompe la tabla', () => {
    const [row] = planRows([exercise({ exercise: null })]);
    expect(row.name).toBe('Ejercicio');
  });

  it('sin ejercicios no hay filas', () => {
    expect(planRows([])).toEqual([]);
    expect(planRows()).toEqual([]);
  });
});

describe('planSummary', () => {
  it('resume ejercicios, series y minutos de la rutina del día', () => {
    const exercises = [exercise({ sets: 4, rest_seconds: 90 }), exercise({ sets: 3, rest_seconds: 60 })]; // 855 s
    expect(planSummary(exercises)).toBe('2 EJERCICIOS · 7 SERIES · ~14 MIN');
  });

  it('usa el singular con un ejercicio y una serie', () => {
    expect(planSummary([exercise({ sets: 1, rest_seconds: 60 })])).toBe('1 EJERCICIO · 1 SERIE · ~2 MIN');
  });

  it('cuenta con los valores por defecto lo que la rutina no trae (3 series, 90 s)', () => {
    expect(planSummary([exercise({ sets: null, rest_seconds: null })])).toBe('1 EJERCICIO · 3 SERIES · ~7 MIN');
  });

  it('sin ejercicios no se rompe', () => {
    expect(planSummary([])).toBe('0 EJERCICIOS · 0 SERIES · ~0 MIN');
    expect(planSummary()).toBe('0 EJERCICIOS · 0 SERIES · ~0 MIN');
    expect(planSummary(null)).toBe('0 EJERCICIOS · 0 SERIES · ~0 MIN');
  });
});

describe('exerciseCount', () => {
  it('cuenta los ejercicios, en singular con uno', () => {
    expect(exerciseCount([exercise(), exercise(), exercise()])).toBe('3 ejercicios');
    expect(exerciseCount([exercise()])).toBe('1 ejercicio');
  });

  it('sin ejercicios (también en null) son 0', () => {
    expect(exerciseCount([])).toBe('0 ejercicios');
    expect(exerciseCount(null)).toBe('0 ejercicios');
    expect(exerciseCount()).toBe('0 ejercicios');
  });
});

describe('withLastSessionKg', () => {
  it('a la rutina de /mine le suma el last_session_kg de la de hoy, por routine_exercise_id', () => {
    const merged = withLastSessionKg(mineRoutine(), todayRoutine());
    expect(merged.exercises.map((item) => item.last_session_kg)).toEqual([62.5, undefined]);
    expect(merged.exercises[0].suggested_kg).toBe(60);
  });

  it('si hoy es otra rutina, o no hay rutina del día, la deja como vino', () => {
    const routine = mineRoutine({ routine_id: 'r-2' });
    expect(withLastSessionKg(routine, todayRoutine())).toBe(routine);
    expect(withLastSessionKg(routine, null)).toBe(routine);
    expect(withLastSessionKg(routine, undefined)).toBe(routine);
  });
});
