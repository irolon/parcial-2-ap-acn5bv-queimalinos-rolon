import { arParts, slotIso } from '@/utils/agenda';
import { hourLabel } from './availability';

export const FIRST_HOUR = 6;
export const LAST_HOUR = 22;
export const MAX_NOTES = 500;

const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);

/**
 * Opciones del select de hora para `date`: "· disponible" si está en `freeSlots`,
 * deshabilitadas las ocupadas (turnos no cancelados) y, si es hoy, las que ya empezaron.
 */
export function hourChoices({ date, freeSlots, appointments, now = new Date() }) {
  const today = arParts(now);
  const free = new Set(freeSlots.filter((s) => arParts(s.starts_at).date === date).map((s) => arParts(s.starts_at).hour));
  const busy = new Set(
    appointments.filter((a) => a.status !== 'cancelled').map((a) => arParts(a.scheduled_at)).filter((p) => p.date === date).map((p) => p.hour),
  );
  return HOURS.map((hour) => {
    const past = date === today.date && hour <= today.hour;
    const taken = busy.has(hour);
    const suffix = taken ? ' · ocupado' : free.has(hour) && !past ? ' · disponible' : '';
    return { value: String(hour), label: `${hourLabel(hour)}${suffix}`, disabled: taken || past || date < today.date };
  });
}

export const scheduledAt = (date, hour) => slotIso(date, Number(hour));
