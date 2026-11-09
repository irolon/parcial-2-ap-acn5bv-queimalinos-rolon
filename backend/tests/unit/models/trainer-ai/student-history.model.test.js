import { describe, it, expect } from '@jest/globals';
import { summarizeHistory } from '../../../../src/models/trainer-ai/student-history.model.js';

const NOW = new Date('2026-11-08T15:00:00Z');
const EX1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const EX2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

const session = (id, finished_at = '2026-11-01T15:00:00Z', rpe = null) => ({ id, finished_at, rpe });
const set = (session_id, exercise_id, actual_kg, actual_reps, completed = true) => ({
  session_id,
  exercise_id,
  actual_kg,
  actual_reps,
  completed,
});
const names = new Map([
  [EX1, { name: 'Press banca plano', muscle_group: 'chest' }],
  [EX2, { name: 'Flexiones', muscle_group: 'chest' }],
]);
const run = (over = {}) =>
  summarizeHistory({ sessions: [], sets: [], exercisesById: names, lastKgById: {}, now: NOW, ...over });

describe('summarizeHistory', () => {
  it('sin sesiones devuelve el resumen vacío', () => {
    expect(run()).toEqual({ sessions_per_week: 0, days_since_last_session: null, avg_rpe: null, exercises: [] });
  });

  it('promedia sesiones por semana, días desde la última y RPE sin contar los null', () => {
    const rpes = [7, null, 8, null, null, null];
    const sessions = rpes.map((rpe, i) =>
      session(`s${i}`, i === 0 ? '2026-11-06T15:00:00Z' : `2026-10-${20 + i}T15:00:00Z`, rpe)
    );
    const out = run({ sessions });
    expect(out.sessions_per_week).toBe(1.5);
    expect(out.days_since_last_session).toBe(2);
    expect(out.avg_rpe).toBe(7.5);
  });

  it('el RPE y los kilos que vienen como string (numeric de Postgres) salen como número', () => {
    const out = run({
      sessions: [session('s1', undefined, '7.5'), session('s2', undefined, '8.0')],
      sets: [set('s1', EX1, '62.50', 8)],
      lastKgById: { [EX1]: '60.00' },
    });
    expect(out.avg_rpe).toBe(7.8);
    expect(out.exercises[0].best_set).toEqual({ kg: 62.5, reps: 8 });
    expect(out.exercises[0].last_kg).toBe(60);
  });

  it('la mejor serie es la de más kilos entre las completadas y last_kg sale de lastKgById', () => {
    const sets = [set('s1', EX1, 60, 8), set('s1', EX1, 70, 5), set('s1', EX1, 80, 3, false), set('s1', EX2, 0, 10)];
    const out = run({ sessions: [session('s1')], sets, lastKgById: { [EX1]: 72.5 } });
    const press = out.exercises.find((e) => e.exercise_id === EX1);
    expect(press).toEqual({
      exercise_id: EX1,
      exercise_name: 'Press banca plano',
      muscle_group: 'chest',
      sessions: 1,
      best_set: { kg: 70, reps: 5 },
      last_kg: 72.5,
    });
    expect(out.exercises.find((e) => e.exercise_id === EX2).last_kg).toBeNull();
  });

  it('sin kilos (peso corporal) best_set.kg es null con las repeticiones máximas', () => {
    const sets = [set('s1', EX2, null, 12), set('s1', EX2, null, 15)];
    const out = run({ sessions: [session('s1')], sets });
    expect(out.exercises[0].best_set).toEqual({ kg: null, reps: 15 });
    expect(JSON.stringify(out)).not.toMatch(/NaN/);
  });

  it('ignora series sin ejercicio o de ejercicios que ya no existen', () => {
    const sets = [set('s1', null, 50, 10), set('s1', 'zzzz', 50, 10), set('s1', EX1, 50, 10)];
    const out = run({ sessions: [session('s1')], sets });
    expect(out.exercises.map((e) => e.exercise_id)).toEqual([EX1]);
  });

  it('corta en 15, por sesiones de mayor a menor y, a igual cantidad, por nombre', () => {
    const ids = Array.from({ length: 17 }, (_, i) => `ex-${String(i).padStart(2, '0')}`);
    const byId = new Map(ids.map((id, i) => [id, { name: `Ejercicio ${String.fromCharCode(90 - i)}`, muscle_group: 'legs' }]));
    const sessions = [session('s1'), session('s2')];
    const sets = ids.map((id) => set('s1', id, 10, 10));
    sets.push(set('s2', ids[16], 10, 10)); // el último hizo 2 sesiones: va primero
    const out = run({ sessions, sets, exercisesById: byId });
    expect(out.exercises).toHaveLength(15);
    expect(out.exercises[0].exercise_id).toBe(ids[16]);
    const rest = out.exercises.slice(1).map((e) => e.exercise_name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'es')));
    // Los dos que quedan afuera son los de nombre más grande (A..Z ascendente: ids 0 y 1 son Z e Y).
    expect(out.exercises.map((e) => e.exercise_id)).not.toContain(ids[0]);
    expect(out.exercises.map((e) => e.exercise_id)).not.toContain(ids[1]);
  });

  it('cuenta sesiones distintas, no series', () => {
    const sets = [set('s1', EX1, 50, 10), set('s1', EX1, 50, 9), set('s1', EX1, 50, 8)];
    expect(run({ sessions: [session('s1')], sets }).exercises[0].sessions).toBe(1);
  });

  it('un ejercicio que solo tiene series sin completar no aparece', () => {
    const sets = [set('s1', EX1, 50, 10, false)];
    expect(run({ sessions: [session('s1')], sets }).exercises).toEqual([]);
  });
});
