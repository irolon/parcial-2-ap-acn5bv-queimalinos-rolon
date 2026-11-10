import { describe, expect, it } from 'vitest';
import { detailRows, formatPct, improvementPct, sparkPoints } from '@/utils/progress/exerciseDetail';

const pt = (day, kg, extra = {}) => ({
  date: `2026-10-${String(day).padStart(2, '0')}`, max_kg: kg, e1rm_kg: kg + 10, volume_kg: kg * 10, reps: 30, ...extra,
});
const curve = (id, points, days = 5, name = id) => ({ id, name, days, points });

describe('improvementPct', () => {
  it('es (último − primero) / primero, redondeado a entero', () => {
    expect(improvementPct([60, 65, 70])).toBe(17);
    expect(improvementPct([80, 70, 60])).toBe(-25);
  });

  it('da 0 si es igual y null si el primero es 0', () => {
    expect(improvementPct([70, 75, 70])).toBe(0);
    expect(improvementPct([0, 5, 10])).toBeNull();
  });
});

describe('formatPct', () => {
  it('lleva signo y espacio antes del %, y — sin dato', () => {
    expect(formatPct(17)).toBe('+17 %');
    expect(formatPct(-5)).toBe('-5 %');
    expect(formatPct(0)).toBe('0 %');
    expect(formatPct(null)).toBe('—');
  });
});

describe('sparkPoints', () => {
  it('reparte los valores a lo ancho, con el mayor arriba y 2 px de margen', () => {
    expect(sparkPoints([60, 70, 80], 64, 26)).toBe('2,24 32,13 62,2');
  });

  it('una serie plana queda al medio', () => {
    expect(sparkPoints([5, 5, 5], 64, 26)).toBe('2,13 32,13 62,13');
  });
});

describe('detailRows', () => {
  it('valor actual, valores y % del rango con la métrica elegida', () => {
    const [row] = detailRows([curve('a', [pt(1, 60), pt(2, 65), pt(3, 70)])], 'max_kg');
    expect(row).toMatchObject({ id: 'a', metric: 'max_kg', values: [60, 65, 70], current: 70, pct: 17 });
  });

  it('con 1RM estimado cae a peso máximo en el ejercicio sin ningún e1rm_kg', () => {
    const noE1rm = [1, 2, 3].map((d) => pt(d, 60 + d, { e1rm_kg: null }));
    const rows = detailRows([curve('a', [pt(1, 60), pt(2, 65), pt(3, 70)]), curve('b', noE1rm)], 'e1rm_kg');
    expect(rows.map((r) => [r.id, r.metric])).toEqual([['a', 'e1rm_kg'], ['b', 'max_kg']]);
  });

  it('el de peso corporal usa repeticiones con cualquier métrica', () => {
    const bw = [1, 2, 3].map((d) => pt(d, 0, { e1rm_kg: null, volume_kg: 0, reps: 10 + d }));
    const [row] = detailRows([curve('bw', bw)], 'volume_kg');
    expect(row).toMatchObject({ metric: 'reps', current: 13 });
  });

  it('descarta los de menos de 3 puntos válidos y ordena por días y nombre, en orden de fecha', () => {
    const three = [pt(3, 70), pt(1, 60), pt(2, 65)];
    const rows = detailRows([
      curve('few', [pt(1, 60), pt(2, 61, { volume_kg: null }), pt(3, 62)], 9),
      curve('c', three, 4, 'Sentadilla'),
      curve('b', three, 4, 'Press banca'),
      curve('a', three, 7, 'Remo'),
    ], 'volume_kg');
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(rows[0].values).toEqual([600, 650, 700]);
  });
});
