import { describe, expect, it } from 'vitest';
import { hasKg, METRICS, metricOptions, MIN_POINTS, recordLabel, resolveMetric } from '@/utils/progress/metrics';

const withKg = [{ max_kg: 0, e1rm_kg: 0, volume_kg: 0, reps: 8 }, { max_kg: 60, e1rm_kg: 70, volume_kg: 600, reps: 10 }];
const bodyweight = [{ max_kg: 0, e1rm_kg: null, volume_kg: 0, reps: 8 }, { max_kg: 0, e1rm_kg: null, volume_kg: 0, reps: 9 }];

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

  it('metricOptions deshabilita una métrica sin valores aunque haya kg (1RM todo null)', () => {
    const pts = [{ max_kg: 60, volume_kg: 600, e1rm_kg: null, reps: 15 }, { max_kg: 62, volume_kg: 620, e1rm_kg: null, reps: 14 }];
    const o = Object.fromEntries(metricOptions(pts).map((m) => [m.value, m]));
    expect(o.e1rm_kg.disabled).toBe(true);
    expect(o.e1rm_kg.reason).toBe('Sin datos en este rango');
    expect(o.max_kg.disabled).toBe(false);
  });

  it('el motivo es "Sin peso registrado" para kg sin kg y "Sin datos en este rango" sin puntos', () => {
    expect(metricOptions(bodyweight).find((m) => m.value === 'max_kg').reason).toBe('Sin peso registrado');
    const empty = metricOptions([]);
    expect(empty.every((m) => m.disabled)).toBe(true);
    expect(empty.find((m) => m.value === 'reps').reason).toBe('Sin datos en este rango');
  });

  it('resolveMetric cae en la primera habilitada si la pedida está deshabilitada', () => {
    const pts = [{ max_kg: 0, e1rm_kg: null, volume_kg: 0, reps: 8 }];
    expect(resolveMetric(pts, 'e1rm_kg', 'e1rm_kg')).toBe('reps');
    expect(resolveMetric(pts, 'reps', 'e1rm_kg')).toBe('reps');
    expect(resolveMetric([], 'max_kg', 'e1rm_kg')).toBe('e1rm_kg');
  });

  it('recordLabel: "Récord" con Todo y "Mejor del rango" con un rango', () => {
    expect(recordLabel('all')).toBe('Récord');
    expect(recordLabel('1m')).toBe('Mejor del rango');
    expect(recordLabel('3m')).toBe('Mejor del rango');
  });
});
