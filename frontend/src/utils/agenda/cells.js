import { pad } from '@/utils/dates';
import { WEEKDAYS_LONG, WEEKDAYS_TITLE, arParts } from './time';

const DEFAULT_FIRST = 8;
const DEFAULT_LAST = 20;

const hourOf = (time) => Number(time.slice(0, 2));
const rangeOf = (first, last) => Array.from({ length: Math.max(last - first + 1, 0) }, (_, i) => first + i);

/** Horas enteras (inicio de fila) desde la menor `start_time` hasta la mayor `end_time` − 1; sin franjas, 8..20. */
export function hourRange(availability) {
  const slots = availability ?? [];
  if (slots.length === 0) return rangeOf(DEFAULT_FIRST, DEFAULT_LAST);
  const first = Math.min(...slots.map((s) => hourOf(s.start_time)));
  const last = Math.max(...slots.map((s) => hourOf(s.end_time))) - 1;
  return rangeOf(first, last);
}

/** Si la fila de `hour` del día `weekday` (1 = lunes … 7) cae dentro de alguna franja de la disponibilidad. */
export const isAvailable = (availability, weekday, hour) =>
  (availability ?? []).some((s) => s.weekday === weekday && hourOf(s.start_time) <= hour && hour < hourOf(s.end_time));

/** Celda `{ date, hour }` (fecha y hora de Argentina) donde cae un turno. */
export function appointmentCell(appt) {
  const { date, hour } = arParts(appt.scheduled_at);
  return { date, hour };
}

/** `'Jue 06/11 · 18:00–19:00'` (hora de Argentina, turnos de 60 min). */
export function timeRangeLabel(iso) {
  const { date, hour, weekday } = arParts(iso);
  const [, month, day] = date.split('-');
  return `${WEEKDAYS_TITLE[weekday - 1]} ${day}/${month} · ${pad(hour)}:00–${pad((hour + 1) % 24)}:00`;
}

/** `'viernes 06/11 18:00'` (hora de Argentina). */
export function dayHourLabel(iso) {
  const { date, hour, weekday } = arParts(iso);
  const [, month, day] = date.split('-');
  return `${WEEKDAYS_LONG[weekday - 1]} ${day}/${month} ${pad(hour)}:00`;
}

/** `'vie 06/11 a las 18:00'` (hora de Argentina). */
export function shortDayHourLabel(iso) {
  const { date, hour, weekday } = arParts(iso);
  const [, month, day] = date.split('-');
  return `${WEEKDAYS_TITLE[weekday - 1].toLowerCase()} ${day}/${month} a las ${pad(hour)}:00`;
}
