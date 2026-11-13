import { compareMetric, isBodyweight } from './compare';
import { MIN_POINTS } from './metrics';

const PAD = 2;

const round1 = (n) => Math.round(n * 10) / 10;

const hasValue = (v) => v !== null && v !== undefined;

/** % de mejora del rango: (último − primero) / primero, redondeado a entero; `null` si el primero es 0. */
export function improvementPct(values) {
  const first = values[0];
  if (!first) return null;
  return Math.round(((values.at(-1) - first) / first) * 100);
}

/** `+17 %`, `-5 %`, `0 %`; `—` si no hay porcentaje. */
export const formatPct = (pct) => {
  if (pct === null || pct === undefined) return '—';
  return `${pct > 0 ? '+' : ''}${pct} %`;
};

/**
 * Puntos (`x,y x,y…`) de una sparkline de `w × h` con 2 px de margen: los valores repartidos a lo ancho y el mayor
 * arriba; una serie plana queda al medio.
 */
export function sparkPoints(values, w, h) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = values.length > 1 ? (w - 2 * PAD) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? PAD + i * step : w / 2;
      const y = max === min ? h / 2 : PAD + (1 - (v - min) / (max - min)) * (h - 2 * PAD);
      return `${round1(x)},${round1(y)}`;
    })
    .join(' ');
}

const byDaysThenName = (a, b) => b.days - a.days || a.name.localeCompare(b.name, 'es');

/**
 * Filas del detalle por ejercicio a partir de las curvas del rango (`{ id, name, days, points }`): la métrica de cada
 * una es la elegida (`wanted`, con la caída de 1RM a peso máximo de la comparada) o repeticiones si es de peso
 * corporal. Quedan las de al menos MIN_POINTS valores, de más a menos días y por nombre:
 * `{ id, name, days, metric, maxFallback, values, current, pct }` (`values` en orden de fecha, `current` el último;
 * `maxFallback`: se pidió 1RM y cayó a peso máximo).
 */
export function detailRows(curves, wanted) {
  return curves
    .map((curve) => {
      const metric = isBodyweight(curve.points) ? 'reps' : compareMetric(curve.points, wanted);
      const values = [...curve.points]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => p[metric])
        .filter(hasValue);
      const maxFallback = wanted === 'e1rm_kg' && metric === 'max_kg';
      return { id: curve.id, name: curve.name, days: curve.days, metric, maxFallback, values, current: values.at(-1), pct: improvementPct(values) };
    })
    .filter((row) => row.values.length >= MIN_POINTS)
    .sort(byDaysThenName);
}
