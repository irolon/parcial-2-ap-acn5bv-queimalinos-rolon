import { challengeProgress } from '../../../../src/models/gamification/challenge-progress.js';

const progress = (goal_type, goal_value, facts) =>
  challengeProgress({ goal_type, goal_value }, facts);

describe('challengeProgress · contadores', () => {
  it('sessions_count', () => {
    expect(progress('sessions_count', 12, { sessionsInWindow: 3 })).toEqual({
      current_progress: 3,
      progress_pct: 25,
      reached: false,
    });
  });

  it('volume redondea a 1 decimal', () => {
    const r = progress('volume', '10000', { volumeInWindow: 3333 });
    expect(r.progress_pct).toBe(33.3);
    expect(r.current_progress).toBe(3333);
  });

  it('streak', () => {
    expect(progress('streak', 14, { bestStreakInWindow: 14 })).toEqual({
      current_progress: 14,
      progress_pct: 100,
      reached: true,
    });
  });

  it('el porcentaje se topa en 100 si se supera la meta', () => {
    const r = progress('sessions_count', 10, { sessionsInWindow: 15 });
    expect(r.progress_pct).toBe(100);
    expect(r.reached).toBe(true);
  });

  it('sin datos queda en 0', () => {
    expect(progress('volume', 100, {})).toEqual({
      current_progress: 0,
      progress_pct: 0,
      reached: false,
    });
  });
});

describe('challengeProgress · weight_target', () => {
  it('bajando: avance parcial', () => {
    const r = progress('weight_target', 70, { startWeight: 80, lastWeight: 75 });
    expect(r).toEqual({ current_progress: 75, progress_pct: 50, reached: false });
  });

  it('bajando: meta alcanzada', () => {
    const r = progress('weight_target', 70, { startWeight: 80, lastWeight: 69.5 });
    expect(r.reached).toBe(true);
    expect(r.progress_pct).toBe(100);
  });

  it('bajando: si sube respecto del inicio el porcentaje no baja de 0', () => {
    const r = progress('weight_target', 70, { startWeight: 80, lastWeight: 82 });
    expect(r.progress_pct).toBe(0);
    expect(r.reached).toBe(false);
  });

  it('subiendo: avance parcial', () => {
    const r = progress('weight_target', 70, { startWeight: 60, lastWeight: 65 });
    expect(r).toEqual({ current_progress: 65, progress_pct: 50, reached: false });
  });

  it('subiendo: meta alcanzada justo en el valor', () => {
    const r = progress('weight_target', 70, { startWeight: '60', lastWeight: '70' });
    expect(r.reached).toBe(true);
    expect(r.progress_pct).toBe(100);
  });

  it('sin medidas: progreso 0 y no alcanzada', () => {
    const none = { current_progress: 0, progress_pct: 0, reached: false };
    expect(progress('weight_target', 70, {})).toEqual(none);
    expect(progress('weight_target', 70, { startWeight: 80, lastWeight: null })).toEqual(none);
    expect(progress('weight_target', 70, { startWeight: null, lastWeight: 75 })).toEqual(none);
  });

  it('peso inicial igual a la meta: 100% alcanzada', () => {
    const r = progress('weight_target', 70, { startWeight: 70, lastWeight: 71 });
    expect(r.progress_pct).toBe(100);
    expect(r.reached).toBe(true);
  });
});

describe('challengeProgress · tope y datos inválidos', () => {
  it('sin alcanzar la meta el porcentaje se topa en 99.9', () => {
    const r = progress('volume', 10000, { volumeInWindow: 9996 });
    expect(r).toEqual({ current_progress: 9996, progress_pct: 99.9, reached: false });
  });

  it('weight_target sin alcanzar tampoco muestra 100', () => {
    const r = progress('weight_target', 70, { startWeight: 80, lastWeight: 70.004 });
    expect(r.progress_pct).toBe(99.9);
    expect(r.reached).toBe(false);
  });

  it('goal_type desconocido → sin progreso', () => {
    expect(progress('otro', 10, { sessionsInWindow: 99 })).toEqual({
      current_progress: 0,
      progress_pct: 0,
      reached: false,
    });
  });

  it('goal_value <= 0 → sin progreso y no alcanzada', () => {
    const none = { current_progress: 0, progress_pct: 0, reached: false };
    expect(progress('sessions_count', 0, { sessionsInWindow: 5 })).toEqual(none);
    expect(progress('weight_target', -1, { startWeight: 80, lastWeight: 75 })).toEqual(none);
  });
});
