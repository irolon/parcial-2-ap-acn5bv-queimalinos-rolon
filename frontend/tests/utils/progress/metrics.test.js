import { describe, expect, it } from 'vitest';
import { hasKg, METRICS, metricOptions, MIN_POINTS } from '@/utils/progress/metrics';

const withKg = [{ max_kg: 0 }, { max_kg: 60 }];
const bodyweight = [{ max_kg: 0 }, { max_kg: 0 }];

describe('metrics de progreso', () => {
  it('define las 4 métricas y el mínimo de puntos', () => {
    expect(METRICS.map((m) => m.value)).toEqual(['e1rm_kg', 'max_kg', 'volume_kg', 'reps']);
    expect(MIN_POINTS).toBe(3);
  });

  it('hasKg es verdadero si algún punto tiene max_kg > 0', () => {
    expect(hasKg(withKg)).toBe(true);
    expect(hasKg(bodyweight)).toBe(false);
    expect(hasKg([])).toBe(false);
  });

  it('metricOptions habilita todo cuando hay kg', () => {
    expect(metricOptions(withKg).every((m) => !m.disabled)).toBe(true);
  });

  it('metricOptions deshabilita las de kg y deja reps cuando no hay kg', () => {
    const disabled = Object.fromEntries(metricOptions(bodyweight).map((m) => [m.value, m.disabled]));
    expect(disabled).toEqual({ e1rm_kg: true, max_kg: true, volume_kg: true, reps: false });
  });
});
