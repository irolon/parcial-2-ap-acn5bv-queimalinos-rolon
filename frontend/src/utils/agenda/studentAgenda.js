import { pad } from '@/utils/dates';
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, arParts, dayMonth } from './time';

/** Máximo de turnos `pending` a futuro que puede tener un alumno (el backend lo vuelve a chequear). */
export const MAX_PENDING = 3;

const ACTIVE = ['pending', 'confirmed'];
const time = (appt) => new Date(appt.scheduled_at).getTime();
const byDate = (a, b) => time(a) - time(b);

/** Pendientes y confirmados por fecha; al final los cancelados, también por fecha. No muta la lista. */
export function sortForStudent(list) {
  const items = list ?? [];
  return [
    ...items.filter((appt) => appt.status !== 'cancelled').sort(byDate),
    ...items.filter((appt) => appt.status === 'cancelled').sort(byDate),
  ];
}

/**
 * Horarios libres agrupados por día argentino, en orden:
 * `[{ date: 'YYYY-MM-DD', label: 'VIE 06/11', slots: [{ starts_at, time: '18:00' }] }]`.
 */
export function groupFreeSlots(slots) {
  const days = new Map();
  const sorted = [...(slots ?? [])].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
  for (const slot of sorted) {
    const { date, hour, minute, weekday } = arParts(slot.starts_at);
    if (!days.has(date)) days.set(date, { date, label: `${WEEKDAYS_SHORT[weekday - 1]} ${dayMonth(date)}`, slots: [] });
    days.get(date).slots.push({ starts_at: slot.starts_at, time: `${pad(hour)}:${pad(minute)}` });
  }
  return [...days.values()];
}

/** Cuántos turnos `pending` de la lista empiezan después de `now`. */
export const pendingAhead = (list, now) =>
  (list ?? []).filter((appt) => appt.status === 'pending' && time(appt) > now.getTime()).length;

/** ¿El alumno puede cancelarlo? Pendiente o confirmado y que todavía no empezó. */
export const canCancel = (appt, now) => ACTIVE.includes(appt.status) && time(appt) > now.getTime();

/** Cuánto queda el aviso de "turno pedido" en Mis turnos si no se abre otro diálogo antes. */
export const NOTICE_MS = 8000;

/** Cada cuánto, como mucho, se vuelve a mirar el reloj de Mis turnos. */
export const CLOCK_MAX_MS = 60_000;

/**
 * Milisegundos hasta el próximo cambio de Mis turnos: el próximo `scheduled_at` de la lista (ahí ese turno pasa a
 * "Ya pasó" y deja de contar como pendiente) o `CLOCK_MAX_MS`, lo que llegue primero.
 */
export function msToNextChange(list, now) {
  const ahead = (list ?? []).map(time).filter((t) => t > now.getTime());
  return Math.min(CLOCK_MAX_MS, ...ahead.map((t) => t - now.getTime()));
}

/** `'jueves 12/11 a las 18:00'` (hora de Argentina). */
export function dayAtLabel(iso) {
  const { date, hour, minute, weekday } = arParts(iso);
  return `${WEEKDAYS_LONG[weekday - 1]} ${dayMonth(date)} a las ${pad(hour)}:${pad(minute)}`;
}
