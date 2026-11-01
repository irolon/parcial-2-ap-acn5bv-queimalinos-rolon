import { arParts } from '@/utils/agenda';

// Las clases van completas para que Tailwind las detecte.
export const STATUS_STYLES = {
  pending: {
    label: 'Pendiente',
    block: 'border-warn bg-warn/20',
    text: 'text-warn',
    dot: 'bg-warn',
  },
  confirmed: {
    label: 'Confirmado',
    block: 'border-good bg-good/20',
    text: 'text-good',
    dot: 'bg-good',
  },
  cancelled: {
    label: 'Cancelado',
    block: 'border-ink5 bg-ink5/20 line-through',
    text: 'text-ink6',
    dot: 'bg-ink5',
  },
};

const WEEKDAYS_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const WEEKDAYS_ABBR = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const pad = (n) => String(n).padStart(2, '0');

export const studentName = (appt) => appt.student?.name || 'Alumno';
export const isPast = (appt, now = new Date()) => new Date(appt.scheduled_at).getTime() <= now.getTime();

/** Partes legibles (hora de Argentina) de un instante. */
function labelParts(iso) {
  const { date, hour, weekday } = arParts(iso);
  const [, month, day] = date.split('-');
  return { day, month, hour: pad(hour), weekday: weekday - 1 };
}

/** `'viernes 06/11 18:00'`. */
export function dayHourLabel(iso) {
  const p = labelParts(iso);
  return `${WEEKDAYS_LONG[p.weekday]} ${p.day}/${p.month} ${p.hour}:00`;
}

/** `'jue 06/11 a las 18:00'`. */
export function shortDayHourLabel(iso) {
  const p = labelParts(iso);
  return `${WEEKDAYS_ABBR[p.weekday]} ${p.day}/${p.month} a las ${p.hour}:00`;
}

/** `'Lucía QA, pendiente, viernes 06/11 18:00'`. */
export const appointmentAriaLabel = (appt) =>
  `${studentName(appt)}, ${STATUS_STYLES[appt.status].label.toLowerCase()}, ${dayHourLabel(appt.scheduled_at)}`;
