import {
  DEFAULT_METRIC,
  defaultMetricFor,
  toProgressPoints,
  computePr,
  bodySummary,
  toOverview,
} from '../../../../src/models/progress/progress.model.js';

describe('toProgressPoints', () => {
  it('redondea los valores y convierte date a string', () => {
    const rows = [
      { date: new Date('2026-10-01T00:00:00Z'), max_kg: '70', volume_kg: 1234.56, e1rm_kg: 79.1666, sets: 3, reps: 24 },
      { date: '2026-10-02', max_kg: null, volume_kg: 0, e1rm_kg: null, sets: 1, reps: 10 },
    ];
    expect(toProgressPoints(rows)).toEqual([
      { date: '2026-10-01', max_kg: 70, volume_kg: 1234.6, e1rm_kg: 79.2, sets: 3, reps: 24 },
      { date: '2026-10-02', max_kg: null, volume_kg: 0, e1rm_kg: null, sets: 1, reps: 10 },
    ]);
  });
});

describe('computePr', () => {
  it('devuelve el primer día que alcanza el máximo', () => {
    const pr = computePr([
      { date: '2026-10-01', max_kg: 60, e1rm_kg: 70 },
      { date: '2026-10-05', max_kg: 80, e1rm_kg: 90 },
      { date: '2026-10-09', max_kg: 80, e1rm_kg: 90 },
    ]);
    expect(pr).toEqual({
      max_kg: { value: 80, date: '2026-10-05' },
      e1rm_kg: { value: 90, date: '2026-10-05' },
    });
  });
  it('con max_kg null (peso corporal) o sin puntos devuelve null', () => {
    const points = [{ date: '2026-10-01', max_kg: null, e1rm_kg: null }];
    expect(computePr(points)).toEqual({ max_kg: null, e1rm_kg: null });
    expect(computePr([])).toEqual({ max_kg: null, e1rm_kg: null });
  });
});

describe('bodySummary', () => {
  it('toma el primer y último valor cargado de cada campo y el delta', () => {
    const metrics = [
      { weight_kg: 80.04, waist_cm: null },
      { weight_kg: 79, waist_cm: null },
      { weight_kg: '78.04', waist_cm: 90 },
      { weight_kg: 77.55, waist_cm: 88.2, chest_cm: null },
    ];
    const s = bodySummary(metrics, ['weight_kg', 'waist_cm', 'chest_cm']);
    expect(s.weight_kg).toEqual({ first: 80, last: 77.6, delta: -2.4 });
    expect(s.waist_cm).toEqual({ first: 90, last: 88.2, delta: -1.8 });
    expect(s.chest_cm).toBeNull();
  });
});

it('la métrica por defecto es e1rm_kg', () => {
  expect(DEFAULT_METRIC).toBe('e1rm_kg');
});

describe('defaultMetricFor', () => {
  const point = (max_kg, e1rm_kg = max_kg) => ({ date: '2026-10-01', max_kg, volume_kg: 0, e1rm_kg, sets: 1, reps: 10 });

  it('sin ningún kg (peso corporal) devuelve reps', () => {
    expect(defaultMetricFor([point(null), point(null)])).toBe('reps');
  });

  it('con kg en 0 (peso corporal desde el celular) devuelve reps', () => {
    expect(defaultMetricFor([point(0, null), point(0, null)])).toBe('reps');
  });

  it('con algún punto con 1RM devuelve e1rm_kg', () => {
    expect(defaultMetricFor([point(null), point(40)])).toBe('e1rm_kg');
  });

  it('con kg pero sin 1RM (siempre más de 12 repeticiones) devuelve max_kg', () => {
    expect(defaultMetricFor([point(5, null), point(0, null)])).toBe('max_kg');
  });

  it('sin puntos devuelve e1rm_kg', () => {
    expect(defaultMetricFor([])).toBe('e1rm_kg');
  });
});

describe('toOverview', () => {
  it('mapea ejercicios y semanas, redondea y pasa Date a string', () => {
    const exercises = [
      { exercise_id: 'e1', name: 'Sentadilla', muscle_group: 'legs', days: '4', last_date: new Date('2026-10-27T00:00:00Z') },
    ];
    const weeks = [
      { week_start: new Date('2026-10-20T00:00:00Z'), volume_kg: '5230.45', sessions: '3' },
      { week_start: '2026-10-27', volume_kg: 0, sessions: 0 },
    ];
    expect(toOverview(exercises, weeks)).toEqual({
      exercises: [{ id: 'e1', name: 'Sentadilla', muscle_group: 'legs', days: 4, last_date: '2026-10-27' }],
      weekly_volume: [
        { week_start: '2026-10-20', volume_kg: 5230.5, sessions: 3 },
        { week_start: '2026-10-27', volume_kg: 0, sessions: 0 },
      ],
    });
  });

  it('sin filas devuelve listas vacías', () => {
    expect(toOverview([], [])).toEqual({ exercises: [], weekly_volume: [] });
  });
});
