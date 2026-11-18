import { buildSessions, createRng } from '../../../../scripts/demo/history.js';
import { weekdayName } from '../../../../scripts/demo/dates.js';

const routine = {
  key: 'torso',
  days: ['monday', 'wednesday'],
  exercises: [
    { name: 'Press banca plano', sets: 3, reps: 10, rest: 90, baseKg: 50, stepKg: 2.5 },
    { name: 'Flexiones de brazos', sets: 2, reps: 12, rest: 60, baseKg: 0, stepKg: 0 },
  ],
};
const base = { routines: [routine], from: '2026-10-05', until: '2026-11-18', seed: 7, skipRate: 0 };

describe('demo — historial de sesiones', () => {
  it('solo genera sesiones en los días de la rutina y antes de `until`', () => {
    const sessions = buildSessions(base);
    expect(sessions.length).toBe(13); // 6 lunes + 7 miércoles entre el 5/10 y el 17/11
    for (const s of sessions) {
      expect(routine.days).toContain(weekdayName(s.date));
      expect(s.date < '2026-11-18').toBe(true);
    }
  });

  it('la carga sube semana a semana y se redondea a 2,5 kg', () => {
    const bench = buildSessions(base).map((s) => s.sets.find((x) => x.exercise === 'Press banca plano').kg);
    expect(bench[0]).toBe(50);
    expect(bench.at(-1)).toBeGreaterThan(bench[0]);
    for (let i = 1; i < bench.length; i += 1) expect(bench[i]).toBeGreaterThanOrEqual(bench[i - 1]);
    for (const kg of bench) expect((kg * 2) % 5).toBe(0);
  });

  it('los ejercicios con peso corporal van sin kg', () => {
    const [first] = buildSessions(base);
    const push = first.sets.filter((x) => x.exercise === 'Flexiones de brazos');
    expect(push).toHaveLength(2);
    expect(push.every((x) => x.kg === null)).toBe(true);
  });

  it('cada sesión tiene sus series numeradas, dentro de su horario y con RPE de 6 a 9', () => {
    for (const s of buildSessions(base)) {
      expect(s.sets.filter((x) => x.exercise === 'Press banca plano').map((x) => x.setNumber)).toEqual([1, 2, 3]);
      for (const x of s.sets) expect(x.executedAt > s.startedAt && x.executedAt < s.finishedAt).toBe(true);
      expect(s.rpe).toBeGreaterThanOrEqual(6);
      expect(s.rpe).toBeLessThanOrEqual(9);
    }
  });

  it('con la misma semilla da lo mismo y con skipRate saltea días', () => {
    expect(buildSessions({ ...base, skipRate: 0.3 })).toEqual(buildSessions({ ...base, skipRate: 0.3 }));
    expect(buildSessions({ ...base, skipRate: 0.3 }).length).toBeLessThan(13);
  });

  it('en los últimos `steadyDays` días no falta nunca (así la racha llega viva a la demo)', () => {
    const sessions = buildSessions({ ...base, skipRate: 1, steadyDays: 14 });
    expect(sessions.map((s) => s.date)).toEqual(['2026-11-04', '2026-11-09', '2026-11-11', '2026-11-16']);
  });

  it('el ejercicio sustituto trae su propia carga, no la del original', () => {
    const substitute = () => ({ from: 'Press banca plano', to: 'Flexiones de brazos', baseKg: 0, stepKg: 0 });
    const [first, ...rest] = buildSessions({ ...base, substitute });
    const swapped = first.sets.filter((x) => x.original === 'Press banca plano');
    expect(swapped.length).toBe(3);
    expect(swapped.every((x) => x.exercise === 'Flexiones de brazos' && x.kg === null)).toBe(true);
    const later = rest.at(-1).sets.filter((x) => x.original === 'Press banca plano');
    expect(later.every((x) => x.kg === null)).toBe(true);
  });

  it('`stopBefore` corta el historial antes (alumno que dejó de venir)', () => {
    const sessions = buildSessions({ ...base, stopBefore: '2026-11-06' });
    expect(sessions.every((s) => s.date < '2026-11-06')).toBe(true);
  });

  it('createRng devuelve números entre 0 y 1, repetibles', () => {
    const a = createRng(3);
    const b = createRng(3);
    const values = [a(), a(), a()];
    expect(values).toEqual([b(), b(), b()]);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});
