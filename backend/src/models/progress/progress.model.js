/**
 * Modelo de dominio: Progress (evolución de un alumno).
 * Helpers puros sobre las filas que devuelven las funciones SQL. SIN acceso a datos.
 */

export const DEFAULT_METRIC = 'e1rm_kg';

/** Redondea a 1 decimal. Acepta number, string numérico (rpc) o null. */
export function round1(n) {
  if (n === null || n === undefined || n === '') return null;
  const value = Number(n);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function toDateString(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
}

/** Filas crudas de exercise_progress → puntos con números redondeados. */
export function toProgressPoints(rows) {
  return rows.map((row) => ({
    date: toDateString(row.date),
    max_kg: round1(row.max_kg),
    volume_kg: round1(row.volume_kg),
    e1rm_kg: round1(row.e1rm_kg),
    sets: Number(row.sets),
    reps: Number(row.reps),
  }));
}

function bestOf(points, field) {
  let best = null;
  for (const point of points) {
    const value = point[field];
    if (value === null || value === undefined) continue;
    if (best === null || value > best.value) best = { value, date: point.date };
  }
  return best;
}

/** Récord personal: el primer día que alcanza el máximo de cada métrica. */
export function computePr(points) {
  return { max_kg: bestOf(points, 'max_kg'), e1rm_kg: bestOf(points, 'e1rm_kg') };
}

/** Primera y última medida cargada de cada campo (metricsAsc va de vieja a nueva). */
export function bodySummary(metricsAsc, fields) {
  const summary = {};
  for (const field of fields) {
    const values = metricsAsc.map((m) => round1(m[field])).filter((v) => v !== null);
    if (values.length === 0) {
      summary[field] = null;
      continue;
    }
    const first = values[0];
    const last = values[values.length - 1];
    summary[field] = { first, last, delta: round1(last - first) };
  }
  return summary;
}
