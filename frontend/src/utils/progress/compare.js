import { dateToTime } from './format';
import { MIN_POINTS, hasKg } from './metrics';

/**
 * Cuántas líneas tiene el gráfico comparado y cómo se ve cada una: además del color, el trazo (`dash`, vacío =
 * continuo) y la forma del punto, para que no se distingan solo por color (accent y cool son dos azules).
 */
export const SLOT_STYLES = [
  { color: 'var(--color-accent)', dash: '', shape: 'circle' },
  { color: 'var(--color-cool)', dash: '7 4', shape: 'square' },
  { color: 'var(--color-hot)', dash: '2 3', shape: 'diamond' },
];

const DAY = 86_400_000;

const hasValue = (v) => v !== null && v !== undefined;

const byDaysThenName = (a, b) => b.days - a.days || a.name.localeCompare(b.name, 'es');

/** Entrenó desde `from` (`YYYY-MM-DD`, o nada para todo el historial), según su `last_date` del overview. */
export const trainedSince = (exercise, from) => !from || !exercise.last_date || exercise.last_date >= from;

/**
 * Ejercicios con al menos MIN_POINTS días (de todo el historial), de más a menos días; con `from`, solo los que
 * entrenaron desde esa fecha. Sin tope, con rango o sin él: `days` no dice si hay kg (eso solo se sabe con la curva)
 * y, con rango, tampoco cuántos puntos caen en él, así que cualquier corte podría dejar afuera al único con kg o al
 * que más puntos tiene en el rango.
 */
export function compareCandidates(exercises, { from } = {}) {
  return exercises.filter((e) => e.days >= MIN_POINTS && trainedSince(e, from)).sort(byDaysThenName);
}

/** 1RM estimado si algún punto lo tiene (compara series con distintas reps); si no, el peso máximo. */
export const compareMetric = (points) => (points.some((p) => hasValue(p.e1rm_kg)) ? 'e1rm_kg' : 'max_kg');

const validCount = (points) => {
  const metric = compareMetric(points);
  return points.filter((p) => hasValue(p[metric])).length;
};

/** Tiene kg pero menos de MIN_POINTS puntos válidos: no alcanza para dibujar su línea. */
export const tooFewPoints = (points) => hasKg(points) && validCount(points) < MIN_POINTS;

/** Hay puntos pero ninguno con kg: peso corporal (sin puntos no se sabe). */
export const isBodyweight = (points) => points.length > 0 && !hasKg(points);

/**
 * Las `n` curvas (`{ id, name, days, points }`) con más puntos válidos en el rango, sin las de peso corporal
 * ni las de menos de MIN_POINTS puntos. Desempata por días y después por nombre.
 */
export function pickTop(curves, n = SLOT_STYLES.length) {
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

/**
 * Hasta `n` marcas del eje X repartidas parejo entre la primera y la última fila (`{ time }`, ascendentes),
 * redondeadas al día y sin repetir; una sola si todas son del mismo día. Sin esto recharts pone una por fila.
 */
export function timeTicks(rows, n = 5) {
  if (rows.length === 0) return [];
  const first = rows[0].time;
  const last = rows.at(-1).time;
  if (first === last || n < 2) return [first];
  const ticks = Array.from({ length: n }, (_, i) => Math.round((first + ((last - first) * i) / (n - 1)) / DAY) * DAY);
  return [...new Set(ticks)];
}
