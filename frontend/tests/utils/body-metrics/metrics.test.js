import { describe, expect, it } from 'vitest';
import {
  METRIC_FIELDS,
  METRIC_UNITS,
  buildMetricBody,
  formatBmi,
  formatDelta,
  formatWeight,
  latestByField,
  metricDelta,
  validateMetricBody,
  weightSeries,
} from '@/utils/body-metrics/metrics';
import { metric } from '../../helpers/students/fixtures';

describe('latestByField / metricDelta', () => {
  it('por campo: el último valor no nulo y el anterior no nulo de ese mismo campo', () => {
    const list = [
      metric({ weight_kg: 82, waist_cm: 95, bmi: 25.9 }),
      metric({ weight_kg: 81, waist_cm: null, bmi: 25.6 }),
      metric({ weight_kg: null, waist_cm: 90, bmi: null }),
    ];
    expect(latestByField(list, 'weight_kg')).toEqual({ value: 81, previous: 82 });
    expect(latestByField(list, 'waist_cm')).toEqual({ value: 90, previous: 95 });
    expect(latestByField(list, 'bmi')).toEqual({ value: 25.6, previous: 25.9 });
    expect(latestByField(list, 'chest_cm')).toEqual({ value: null, previous: null });
    expect(latestByField([metric({ weight_kg: 80 })], 'weight_kg')).toEqual({ value: 80, previous: null });
    expect(latestByField([], 'weight_kg')).toEqual({ value: null, previous: null });
  });

  it('delta redondeado, null si falta alguno', () => {
    expect(metricDelta({ value: 80.8, previous: 80 })).toBe(0.8);
    expect(metricDelta({ value: 80, previous: null })).toBeNull();
    expect(metricDelta({ value: null, previous: 80 })).toBeNull();
  });
});

describe('formatDelta', () => {
  it('signo, coma decimal y unidad (opcional)', () => {
    expect(formatDelta(0.3)).toBe('+0,3');
    expect(formatDelta(0.8, 'kg')).toBe('+0,8 kg');
    expect(formatDelta(-1.2, 'cm')).toBe('−1,2 cm');
    expect(formatDelta(0, 'kg')).toBe('=');
    expect(METRIC_FIELDS).toHaveLength(6);
    expect(METRIC_UNITS.body_fat_pct).toBe('%');
  });
});

describe('formatBmi', () => {
  it('siempre un decimal con coma', () => {
    expect(formatBmi(26)).toBe('26,0');
    expect(formatBmi(25.75)).toBe('25,8');
    expect(formatBmi(25.8)).toBe('25,8');
  });
});

describe('formatWeight', () => {
  it('peso con coma decimal y kg (tooltip del gráfico)', () => {
    expect(formatWeight(80.5)).toBe('80,5 kg');
    expect(formatWeight(80)).toBe('80 kg');
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
