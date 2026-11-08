import { describe, expect, it } from 'vitest';
import { compareCandidates, compareMetric, mergeSeries, pickTop, timeTicks } from '@/utils/progress/compare';

const ex = (id, days, name = id, last = '2026-10-27') => ({ id, name, days, muscle_group: 'x', last_date: last });
const pt = (day, kg, e1rm = kg + 10) => ({ date: `2026-10-${String(day).padStart(2, '0')}`, max_kg: kg, e1rm_kg: e1rm });
const curve = (id, points, days = 5, name = id) => ({ id, name, days, points });
const kgPoints = (n) => Array.from({ length: n }, (_, i) => pt(i + 1, 80 + i));
const bodyweightPoints = (n) => Array.from({ length: n }, (_, i) => pt(i + 1, null, null));

describe('compareCandidates', () => {
  it('excluye los de menos de 3 días y ordena por días', () => {
    const result = compareCandidates([ex('a', 3), ex('b', 2), ex('c', 9), ex('d', 5)]);
    expect(result.map((e) => e.id)).toEqual(['c', 'd', 'a']);
  });

  it('corta en 6 por defecto o en el máximo pedido', () => {
    const many = [3, 4, 5, 6, 7, 8, 9, 10].map((d) => ex(`e${d}`, d));
    expect(compareCandidates(many).map((e) => e.id)).toEqual(['e10', 'e9', 'e8', 'e7', 'e6', 'e5']);
    expect(compareCandidates(many, { max: 2 })).toHaveLength(2);
  });

  it('a igual cantidad de días desempata por nombre y no muta la lista', () => {
    const list = [ex('a', 4, 'Sentadilla'), ex('b', 4, 'Press banca')];
    expect(compareCandidates(list).map((e) => e.id)).toEqual(['b', 'a']);
    expect(list[0].id).toBe('a');
  });

  it('con `from` descarta los que no entrenó desde esa fecha antes de cortar en 6', () => {
    const old = [10, 11, 12, 13, 14, 15].map((d) => ex(`old${d}`, d, `old${d}`, '2026-09-20'));
    const fresh = [ex('n1', 4, 'n1', '2026-11-02'), ex('n2', 5, 'n2', '2026-10-05')];
    expect(compareCandidates([...old, ...fresh], { from: '2026-10-05' }).map((e) => e.id)).toEqual(['n2', 'n1']);
    expect(compareCandidates([...old, ...fresh])).toHaveLength(6);
    expect(compareCandidates([...old, ...fresh], { from: null })[0].id).toBe('old15');
  });
});

describe('pickTop', () => {
  it('descarta los de peso corporal y los de menos de 3 puntos válidos', () => {
    const curves = [curve('kg', kgPoints(3)), curve('bw', bodyweightPoints(8)), curve('few', kgPoints(2))];
    expect(pickTop(curves).map((c) => c.id)).toEqual(['kg']);
  });

  it('elige los 3 con más puntos en el rango', () => {
    const curves = [curve('a', kgPoints(3)), curve('b', kgPoints(6)), curve('c', kgPoints(4)), curve('d', kgPoints(5))];
    expect(pickTop(curves).map((c) => c.id)).toEqual(['b', 'd', 'c']);
    expect(pickTop(curves, 1).map((c) => c.id)).toEqual(['b']);
  });

  it('a igual cantidad de puntos desempata por días y después por nombre', () => {
    const curves = [
      curve('a', kgPoints(4), 5, 'Sentadilla'),
      curve('b', kgPoints(4), 9, 'Remo'),
      curve('c', kgPoints(4), 5, 'Press banca'),
    ];
    expect(pickTop(curves).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('cuenta los puntos con max_kg cuando el ejercicio no tiene ningún 1RM estimado', () => {
    const onlyMax = [1, 2, 3].map((d) => pt(d, 100, null));
    expect(pickTop([curve('max', onlyMax)]).map((c) => c.id)).toEqual(['max']);
  });

  it('un ejercicio sin puntos no entra', () => {
    expect(pickTop([curve('empty', [])])).toEqual([]);
  });
});

describe('compareMetric', () => {
  it('usa el 1RM estimado si hay alguno', () => {
    expect(compareMetric([pt(1, 80, null), pt(2, 82)])).toBe('e1rm_kg');
  });

  it('si no hay ningún 1RM estimado usa el peso máximo', () => {
    expect(compareMetric([pt(1, 80, null), pt(2, 82, null)])).toBe('max_kg');
  });
});

describe('mergeSeries', () => {
  it('une por fecha, ordena por tiempo y deja los huecos en null', () => {
    const rows = mergeSeries([curve('a', [pt(1, 80), pt(5, 82)]), curve('b', [pt(3, 100), pt(5, 104)])]);
    expect(rows).toEqual([
      { date: '2026-10-01', time: Date.UTC(2026, 9, 1), a: 90, b: null },
      { date: '2026-10-03', time: Date.UTC(2026, 9, 3), a: null, b: 110 },
      { date: '2026-10-05', time: Date.UTC(2026, 9, 5), a: 92, b: 114 },
    ]);
  });

  it('cada curva usa su métrica: la que no tiene 1RM estimado va con su peso máximo', () => {
    const rows = mergeSeries([curve('a', [pt(1, 80)]), curve('b', [pt(1, 100, null)])]);
    expect(rows[0]).toMatchObject({ a: 90, b: 100 });
  });

  it('acepta la métrica de cada curva y saltea los días sin valor', () => {
    const rows = mergeSeries([curve('a', [pt(1, 80), pt(2, 81, null)])], () => 'e1rm_kg');
    expect(rows).toEqual([{ date: '2026-10-01', time: Date.UTC(2026, 9, 1), a: 90 }]);
  });
});

describe('timeTicks', () => {
  const DAY = 86_400_000;
  const row = (day) => ({ time: Date.UTC(2026, 9, day) });

  it('reparte n marcas parejas entre la primera y la última fecha, ascendentes', () => {
    expect(timeTicks([row(1), row(3), row(9)], 5)).toEqual([1, 3, 5, 7, 9].map((d) => Date.UTC(2026, 9, d)));
  });

  it('redondea al día y no repite marcas', () => {
    const ticks = timeTicks([row(1), row(2), row(3)], 5);
    expect(ticks).toEqual([1, 2, 3].map((d) => Date.UTC(2026, 9, d)));
    for (const t of timeTicks([row(1), row(12)], 4)) expect(t % DAY).toBe(0);
  });

  it('con una sola fecha da una sola marca, y sin filas ninguna', () => {
    expect(timeTicks([row(5), row(5)])).toEqual([Date.UTC(2026, 9, 5)]);
    expect(timeTicks([])).toEqual([]);
  });

  it('por defecto son 5 marcas', () => {
    expect(timeTicks([row(1), row(29)])).toHaveLength(5);
  });
});
