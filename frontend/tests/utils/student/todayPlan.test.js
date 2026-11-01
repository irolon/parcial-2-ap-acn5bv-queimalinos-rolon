import { describe, expect, it } from 'vitest';
import { estimatedMinutes, planRows, totalSets } from '@/utils/student/todayPlan';
import { routineExercise } from '../../helpers/routines/studentRoutines';

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

  it('una última sesión sin peso cargado (0) también cuenta como dato, no cae al sugerido', () => {
    const [row] = planRows([exercise({ last_session_kg: 0, suggested_kg: 20 })]);
    expect(row.suggestedKg).toBe(0);
    expect(row.suggestedLabel).toBe('0 kg');
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
