import { argentinaDate, pad } from '@/utils/dates';

/** "+4%" / "−3%" / "0%"; sin variación (`null`): "". Los mismos textos que el Inicio del celular. */
export function deltaLabel(delta) {
  if (delta == null) return '';
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `−${-delta}%`;
  return '0%';
}

/** "hace un momento", "hace 12 min", "hace 3 h" (mismo día), "ayer" o "05/11", en días argentinos. */
export function relativeTime(iso, now = new Date()) {
  const minutes = Math.max(0, Math.floor((new Date(now) - new Date(iso)) / 60000));
  const at = argentinaDate(iso);
  const days = argentinaDate(now).dayNumber - at.dayNumber;
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (days === 0) return `hace ${Math.floor(minutes / 60)} h`;
  if (days === 1) return 'ayer';
  return `${pad(at.day)}/${pad(at.month)}`;
}

/** Las últimas `n` filas de `daily` (vienen de hoy − 13 a hoy, ascendentes). */
export const lastDays = (daily, n) => (daily ?? []).slice(-n);

const INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const SHORT_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// `YYYY-MM-DD` es un día argentino: se toma su mediodía en Argentina para no depender de la zona del navegador.
const weekdayOf = (date) => argentinaDate(`${date}T12:00:00-03:00`).weekday;

/** Inicial del día de la semana para el eje: L, M, X, J, V, S, D. */
export const dayInitial = (date) => INITIALS[weekdayOf(date) - 1];

/** "Jue 06/11" para el tooltip. */
export const dayTitle = (date) => `${SHORT_DAYS[weekdayOf(date) - 1]} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
