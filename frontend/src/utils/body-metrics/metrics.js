export const METRIC_FIELDS = ['weight_kg', 'height_cm', 'body_fat_pct', 'waist_cm', 'hip_cm', 'chest_cm'];

export const METRIC_UNITS = {
  weight_kg: 'kg',
  height_cm: 'cm',
  body_fat_pct: '%',
  waist_cm: 'cm',
  hip_cm: 'cm',
  chest_cm: 'cm',
};

/** El historial llega ascendente: la última y la anterior. */
export function latestTwo(metrics) {
  return { latest: metrics.at(-1) ?? null, previous: metrics.at(-2) ?? null };
}

/** Diferencia redondeada a 1 decimal, o `null` si falta alguno de los dos valores. */
export function metricDelta(latest, previous, field) {
  const a = latest?.[field];
  const b = previous?.[field];
  if (a == null || b == null) return null;
  return Math.round((a - b) * 10) / 10;
}

/** `+0,8 kg`; sin `unit` (el IMC) va solo el número. */
export function formatDelta(n, unit) {
  if (n === 0) return '=';
  const sign = n > 0 ? '+' : '−';
  const text = `${sign}${String(Math.abs(n)).replace('.', ',')}`;
  return unit ? `${text} ${unit}` : text;
}

/** Valores de `type=number` (strings) → body del POST: números, sin vacíos. */
export function buildMetricBody(values, { id, recordedAt }) {
  const body = { id };
  for (const field of METRIC_FIELDS) {
    const raw = values[field];
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') body[field] = Number(raw);
  }
  body.recorded_at = new Date(recordedAt).toISOString();
  return body;
}

/** `{ campo: mensaje }`; vacío si el body es válido. */
export function validateMetricBody(body) {
  const errors = {};
  let present = 0;
  for (const field of METRIC_FIELDS) {
    if (body[field] === undefined) continue;
    present += 1;
    if (!Number.isFinite(body[field]) || body[field] < 0) errors[field] = 'Tiene que ser un número mayor o igual a 0';
  }
  if (body.body_fat_pct > 100) errors.body_fat_pct = 'Tiene que ser como máximo 100';
  if (present === 0) errors.form = 'Cargá al menos una medida';
  return errors;
}

export function weightSeries(metrics) {
  return metrics.filter((m) => m.weight_kg != null).map((m) => ({ date: m.recorded_at, weight: m.weight_kg }));
}

const pad = (n) => String(n).padStart(2, '0');

/** `dd/mm/aaaa` en la zona horaria local. */
export function formatMetricDate(iso) {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Número con coma decimal (estilo rioplatense). */
export const formatNumber = (n) => String(n).replace('.', ',');

/** IMC con un decimal fijo y coma (`26,0`). */
export const formatBmi = (n) => formatNumber(Number(n).toFixed(1));

/** Valor para un `datetime-local` (`aaaa-mm-ddThh:mm`) en la zona horaria local. */
export function localInputValue(date = new Date()) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
