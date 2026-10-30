import { describe, expect, it } from 'vitest';
import {
  formatKg,
  formatLongDate,
  formatMetric,
  formatReps,
  formatShortDate,
  formatVolume,
} from '@/utils/progress/format';

describe('formato es-AR de progreso', () => {
  it('formatKg usa coma decimal y 1 decimal como máximo', () => {
    expect(formatKg(88.7)).toBe('88,7 kg');
    expect(formatKg(80)).toBe('80 kg');
    expect(formatKg(88.66)).toBe('88,7 kg');
  });

  it('formatVolume pasa a toneladas desde 1000 kg', () => {
    expect(formatVolume(950)).toBe('950 kg');
    expect(formatVolume(999.9)).toBe('999,9 kg');
    expect(formatVolume(1000)).toBe('1 t');
    expect(formatVolume(12400)).toBe('12,4 t');
  });

  it('formatReps', () => {
    expect(formatReps(24)).toBe('24 reps');
  });

  it('formatShortDate → dd/mm', () => {
    expect(formatShortDate('2026-10-27')).toBe('27/10');
  });

  it('formatLongDate arma la fecha sin punto en el mes', () => {
    expect(formatLongDate('2026-10-27')).toBe('27 oct 2026');
    expect(formatLongDate('2026-09-03')).toBe('3 sep 2026');
  });

  it('formatMetric elige el formato según la métrica y muestra — si no hay valor', () => {
    expect(formatMetric('e1rm_kg', 88.7)).toBe('88,7 kg');
    expect(formatMetric('max_kg', 80)).toBe('80 kg');
    expect(formatMetric('volume_kg', 12400)).toBe('12,4 t');
    expect(formatMetric('volume_kg', 950)).toBe('950 kg');
    expect(formatMetric('reps', 24)).toBe('24 reps');
    expect(formatMetric('e1rm_kg', null)).toBe('—');
    expect(formatMetric('reps', undefined)).toBe('—');
  });
});
