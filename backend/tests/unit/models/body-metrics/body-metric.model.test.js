import {
  computeBmi,
  toBodyMetric,
  withBmiHistory,
} from '../../../../src/models/body-metrics/body-metric.model.js';

describe('body-metric.model — computeBmi', () => {
  it('calcula peso / altura² en metros y redondea a un decimal', () => {
    // 80 / 1.8² = 24.69…
    expect(computeBmi(80, 180)).toBe(24.7);
  });

  it('acepta numéricos que llegan como string (numeric de PostgREST)', () => {
    expect(computeBmi('80', '180')).toBe(24.7);
  });

  it('devuelve null si falta el peso, falta la altura o la altura es 0', () => {
    expect(computeBmi(null, 180)).toBeNull();
    expect(computeBmi(80, null)).toBeNull();
    expect(computeBmi(80, undefined)).toBeNull();
    expect(computeBmi(80, 0)).toBeNull();
  });
});

describe('body-metric.model — toBodyMetric', () => {
  it('usa la altura propia de la medida antes que la de respaldo', () => {
    const m = toBodyMetric({ id: 'm1', weight_kg: 80, height_cm: 180 }, 160);
    expect(m).toEqual({ id: 'm1', weight_kg: 80, height_cm: 180, bmi: 24.7 });
  });

  it('usa la altura de respaldo si la medida no trae altura', () => {
    const m = toBodyMetric({ id: 'm1', weight_kg: 80, height_cm: null }, 180);
    expect(m.bmi).toBe(24.7);
    expect(m.height_cm).toBeNull(); // no inventa la altura en la fila
  });
});

describe('body-metric.model — withBmiHistory', () => {
  it('con peso y altura en filas distintas del mismo instante usa esa altura (empate)', () => {
    const at = '2026-10-01T12:00:00+00:00';
    const history = withBmiHistory([
      { id: 'peso', weight_kg: 80, height_cm: null, recorded_at: at }, // llega primero
      { id: 'altura', weight_kg: null, height_cm: 180, recorded_at: at },
    ]);
    expect(history.map((m) => m.bmi)).toEqual([24.7, null]);
  });

  it('el empate compara instantes, no texto (Z vs +00:00)', () => {
    const history = withBmiHistory([
      { id: 'peso', weight_kg: 80, height_cm: null, recorded_at: '2026-10-01T12:00:00Z' },
      { id: 'altura', weight_kg: null, height_cm: 180, recorded_at: '2026-10-01T12:00:00+00:00' },
    ]);
    expect(history[0].bmi).toBe(24.7);
  });

  it('arrastra la última altura conocida hacia las medidas siguientes', () => {
    const history = withBmiHistory([
      { id: 'a', weight_kg: 82, height_cm: null }, // todavía no hay altura
      { id: 'b', weight_kg: 81, height_cm: 180 },
      { id: 'c', weight_kg: 80, height_cm: null }, // usa 180 de "b"
    ]);
    expect(history.map((m) => m.bmi)).toEqual([null, 25, 24.7]);
  });

  it('con un historial vacío devuelve []', () => {
    expect(withBmiHistory([])).toEqual([]);
  });
});
