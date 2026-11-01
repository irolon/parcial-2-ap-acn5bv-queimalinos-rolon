import { dayHourLabel } from '@/utils/agenda';

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
    block: 'border-ink5 bg-ink5/20',
    text: 'text-ink6',
    dot: 'bg-ink5',
  },
};

export const studentName = (appt) => appt.student?.name || 'Alumno';
export const isPast = (appt, now = new Date()) => new Date(appt.scheduled_at).getTime() <= now.getTime();

/** `'Lucía QA, pendiente, viernes 06/11 18:00'`. */
export const appointmentAriaLabel = (appt) =>
  `${studentName(appt)}, ${STATUS_STYLES[appt.status].label.toLowerCase()}, ${dayHourLabel(appt.scheduled_at)}`;
