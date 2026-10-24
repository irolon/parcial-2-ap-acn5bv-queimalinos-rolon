import { describe, expect, it } from 'vitest';
import {
  METRIC_FIELDS,
  METRIC_UNITS,
  buildMetricBody,
  formatDelta,
  latestTwo,
  metricDelta,
  validateMetricBody,
  weightSeries,
} from '@/utils/body-metrics/metrics';
import { metric } from '../../helpers/students/fixtures';

describe('latestTwo / metricDelta', () => {
  it('toma las dos últimas de un historial ascendente', () => {
    const [a, b, c] = [metric(), metric(), metric()];
    expect(latestTwo([a, b, c])).toEqual({ latest: c, previous: b });
    expect(latestTwo([a])).toEqual({ latest: a, previous: null });
    expect(latestTwo([])).toEqual({ latest: null, previous: null });
  });

  it('delta redondeado, null si falta alguno', () => {
    expect(metricDelta({ weight_kg: 80.8 }, { weight_kg: 80 }, 'weight_kg')).toBe(0.8);
    expect(metricDelta({ weight_kg: 80 }, { weight_kg: null }, 'weight_kg')).toBeNull();
    expect(metricDelta(null, { weight_kg: 80 }, 'weight_kg')).toBeNull();
  });
});

describe('formatDelta', () => {
  it('signo, coma decimal y unidad', () => {
    expect(formatDelta(0.8, 'kg')).toBe('+0,8 kg');
    expect(formatDelta(-1.2, 'cm')).toBe('−1,2 cm');
    expect(formatDelta(0, 'kg')).toBe('=');
    expect(METRIC_FIELDS).toHaveLength(6);
    expect(METRIC_UNITS.body_fat_pct).toBe('%');
  });
});

describe('buildMetricBody', () => {
  it('convierte strings a número, omite vacíos y arma recorded_at', () => {
    const body = buildMetricBody(
      { weight_kg: '74.5', height_cm: '', waist_cm: '80', hip_cm: undefined },
      { id: 'uuid-1', recordedAt: '2026-10-20T10:00:00Z' },
    );
    expect(body).toEqual({ id: 'uuid-1', weight_kg: 74.5, waist_cm: 80, recorded_at: '2026-10-20T10:00:00.000Z' });
  });
});

describe('validateMetricBody', () => {
  it('pide al menos una medida', () => {
    expect(validateMetricBody({ id: 'x', recorded_at: 'y' })).toEqual({ form: 'Cargá al menos una medida' });
  });

  it('rechaza negativos y grasa > 100', () => {
    const errors = validateMetricBody({ weight_kg: -1, body_fat_pct: 101 });
    expect(Object.keys(errors).sort()).toEqual(['body_fat_pct', 'weight_kg']);
    expect(validateMetricBody({ weight_kg: 0, body_fat_pct: 100 })).toEqual({});
  });
});

describe('weightSeries', () => {
  it('solo las medidas con peso', () => {
    const list = [metric({ recorded_at: 'd1', weight_kg: 80 }), metric({ recorded_at: 'd2', weight_kg: null })];
    expect(weightSeries(list)).toEqual([{ date: 'd1', weight: 80 }]);
  });
});
