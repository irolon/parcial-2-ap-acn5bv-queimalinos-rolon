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

  it('resolveMetric prefiere una métrica con al menos 3 valores (caso Curl)', () => {
    // 10 días: 1RM con un solo valor, repeticiones con los 10 (9 de ellos > 12).
    const curl = [...Array(10)].map((_, i) => ({ max_kg: 30, volume_kg: 300, e1rm_kg: i === 0 ? 40 : null, reps: i === 0 ? 10 : 15 }));
    expect(metricOptions(curl).find((m) => m.value === 'e1rm_kg').disabled).toBe(false);
    expect(resolveMetric(curl, 'e1rm_kg', 'e1rm_kg')).toBe('max_kg');
    expect(resolveMetric(curl, 'reps', 'e1rm_kg')).toBe('reps');
  });

  it('resolveMetric conserva la pedida o la por defecto si tienen 3 o más valores', () => {
    const pts = [1, 2, 3].map((n) => ({ max_kg: n, volume_kg: n, e1rm_kg: n, reps: n }));
    expect(resolveMetric(pts, 'volume_kg', 'e1rm_kg')).toBe('volume_kg');
    const few = [{ max_kg: 1, volume_kg: 1, e1rm_kg: null, reps: 1 }, { max_kg: 2, volume_kg: 2, e1rm_kg: 5, reps: 2 }, { max_kg: 3, volume_kg: 3, e1rm_kg: null, reps: 3 }];
    expect(resolveMetric(few, 'e1rm_kg', 'max_kg')).toBe('max_kg');
  });

  it('resolveMetric sin ninguna métrica con 3 valores aplica las reglas anteriores', () => {
    const two = [{ max_kg: 1, volume_kg: 1, e1rm_kg: 1, reps: 1 }, { max_kg: 2, volume_kg: 2, e1rm_kg: 2, reps: 2 }];
    expect(resolveMetric(two, 'reps', 'e1rm_kg')).toBe('reps');
    expect(resolveMetric([], 'max_kg', 'e1rm_kg')).toBe('e1rm_kg');
  });

  it('recordLabel: "Récord" con Todo y "Mejor del rango" con un rango', () => {
    expect(recordLabel('all')).toBe('Récord');
    expect(recordLabel('1m')).toBe('Mejor del rango');
    expect(recordLabel('3m')).toBe('Mejor del rango');
  });
});
