const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, useGrouping: false });

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `88,7 kg`. */
export const formatKg = (n) => `${number.format(n)} kg`;

/** Menos de 1000 kg en kg (`950 kg`); desde 1000, en toneladas (`12,4 t`). Se decide tras redondear (999,96 → `1 t`). */
export function formatVolume(kg) {
  const rounded = Math.round(kg * 10) / 10;
  return rounded >= 1000 ? `${number.format(kg / 1000)} t` : formatKg(kg);
}

/** `24 reps`. */
export const formatReps = (n) => `${number.format(n)} reps`;

/** `YYYY-MM-DD` → `27/10`. */
export function formatShortDate(iso) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

/** `YYYY-MM-DD` → `27 oct 2026` (sin depender de las abreviaturas de Intl, que pueden llevar punto). */
export function formatLongDate(iso) {
  const [year, month, day] = iso.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** `YYYY-MM-DD` → milisegundos UTC (eje X numérico de los gráficos de tiempo). */
export const dateToTime = (iso) => Date.parse(`${iso}T00:00:00Z`);

/** Milisegundos UTC → `YYYY-MM-DD`. */
export const timeToDate = (time) => new Date(time).toISOString().slice(0, 10);

/** Valor de una métrica con su unidad; `—` si no hay dato. */
export function formatMetric(metric, value) {
  if (value === null || value === undefined) return '—';
  if (metric === 'reps') return formatReps(value);
  if (metric === 'volume_kg') return formatVolume(value);
  return formatKg(value);
}
