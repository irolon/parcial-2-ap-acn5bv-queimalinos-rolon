import { dateToTime } from './format';
import { MIN_POINTS, hasKg } from './metrics';

/** Cuántas curvas se piden para elegir las líneas (las de más días). */
export const MAX_CANDIDATES = 6;

/** Cuántas líneas tiene el gráfico comparado, y el color de cada una. */
export const SLOT_COLORS = ['var(--color-accent)', 'var(--color-cool)', 'var(--color-hot)'];

const hasValue = (v) => v !== null && v !== undefined;

const byDaysThenName = (a, b) => b.days - a.days || a.name.localeCompare(b.name, 'es');

/** Ejercicios con al menos MIN_POINTS días (de todo el historial), de más a menos días; hasta `max`. */
export function compareCandidates(exercises, max = MAX_CANDIDATES) {
  return exercises.filter((e) => e.days >= MIN_POINTS).sort(byDaysThenName).slice(0, max);
}

/** 1RM estimado si algún punto lo tiene (compara series con distintas reps); si no, el peso máximo. */
export const compareMetric = (points) => (points.some((p) => hasValue(p.e1rm_kg)) ? 'e1rm_kg' : 'max_kg');

const validCount = (points) => {
  const metric = compareMetric(points);
  return points.filter((p) => hasValue(p[metric])).length;
};

/** Hay puntos pero ninguno con kg: peso corporal (sin puntos no se sabe). */
export const isBodyweight = (points) => points.length > 0 && !hasKg(points);

/**
 * Las `n` curvas (`{ id, name, days, points }`) con más puntos válidos en el rango, sin las de peso corporal
 * ni las de menos de MIN_POINTS puntos. Desempata por días y después por nombre.
 */
export function pickTop(curves, n = SLOT_COLORS.length) {
  return curves
    .filter((c) => hasKg(c.points))
    .map((c) => ({ curve: c, count: validCount(c.points) }))
    .filter((c) => c.count >= MIN_POINTS)
    .sort((a, b) => b.count - a.count || byDaysThenName(a.curve, b.curve))
    .slice(0, n)
    .map((c) => c.curve);
}

/**
 * Filas `{ date, time, [id]: valor }` del gráfico, una por fecha con algún valor y ascendentes; los ejercicios
 * sin valor ese día quedan en `null`. `metric(curva)` da la clave de cada curva (por defecto, `compareMetric`).
 */
export function mergeSeries(curves, metric = (c) => compareMetric(c.points)) {
  const rows = new Map();
  for (const curve of curves) {
    const key = metric(curve);
    for (const p of curve.points) {
      if (!hasValue(p[key])) continue;
      const row = rows.get(p.date) ?? { date: p.date, time: dateToTime(p.date) };
      row[curve.id] = p[key];
      rows.set(p.date, row);
    }
  }
  const sorted = [...rows.values()].sort((a, b) => a.time - b.time);
  for (const row of sorted) for (const curve of curves) row[curve.id] ??= null;
  return sorted;
}
