import { WEEKDAYS } from '@/utils/dates';

/** Días de la semana de lunes a domingo, con inicial para los selectores (el nombre sale de `WEEKDAYS`). */
export const DAY_OPTIONS = [
  { value: 'monday', short: 'L' },
  { value: 'tuesday', short: 'M' },
  { value: 'wednesday', short: 'X' },
  { value: 'thursday', short: 'J' },
  { value: 'friday', short: 'V' },
  { value: 'saturday', short: 'S' },
  { value: 'sunday', short: 'D' },
].map((day, index) => ({ ...day, label: WEEKDAYS[index] }));

/** Copia de `days` en orden de semana (lunes primero); un valor desconocido queda al final. */
export function sortDays(days = []) {
  const rank = (day) => {
    const index = DAY_OPTIONS.findIndex((d) => d.value === day);
    return index < 0 ? DAY_OPTIONS.length : index;
  };
  return [...days].sort((a, b) => rank(a) - rank(b));
}

const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));

/** Días de la rutina en español, separados por " · "; un valor desconocido se muestra tal cual. */
export function formatRoutineDays(days = []) {
  return days.map((day) => DAY_LABELS[day] ?? day).join(' · ');
}

const SHORT_LABELS = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
};

/** Días de la rutina abreviados y en orden de semana ("Lun · Mié · Vie"); un valor desconocido se muestra tal cual. */
export function formatRoutineDaysShort(days) {
  return sortDays(days ?? []).map((day) => SHORT_LABELS[day] ?? day).join(' · ');
}
