import { WEEKDAYS, pad } from '@/utils/dates';
import { DAY_MS, arParts, isoDay, parseDay } from './time';

const UPCOMING = ['pending', 'confirmed'];

/** `{ from, to }` (`YYYY-MM-DD`, fecha argentina) de hoy a hoy + `days` − 1: con 14, de hoy a hoy + 13. */
export function nextDaysRange(now, days) {
  const from = arParts(now).date;
  return { from, to: isoDay(new Date(parseDay(from).getTime() + (days - 1) * DAY_MS)) };
}

/** El turno `pending` o `confirmed` más cercano con `scheduled_at` posterior a `now`, o `null`. */
export function nextAppointment(list, now) {
  const after = now.getTime();
  const upcoming = (list ?? []).filter(
    (appt) => UPCOMING.includes(appt.status) && new Date(appt.scheduled_at).getTime() > after,
  );
  if (upcoming.length === 0) return null;
  return upcoming.reduce((first, appt) => (new Date(appt.scheduled_at) < new Date(first.scheduled_at) ? appt : first));
}

/** `'Jueves 12/11 · 18:00'` (hora de Argentina). */
export function nextAppointmentLabel(iso) {
  const { date, hour, minute, weekday } = arParts(iso);
  const [, month, day] = date.split('-');
  return `${WEEKDAYS[weekday - 1]} ${day}/${month} · ${pad(hour)}:${pad(minute)}`;
}
