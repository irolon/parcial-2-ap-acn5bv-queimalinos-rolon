import { WEEKDAYS_LONG, hourLabel } from '@/utils/agenda';

export const DAY_NAMES = WEEKDAYS_LONG.map((name) => name[0].toUpperCase() + name.slice(1));
export const NEW_SLOT = { start_time: '09:00', end_time: '10:00' };

/** Opciones de hora en punto `from`..`to` (inclusive) para un select. */
export const hourOptions = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: hourLabel(from + i) }));

const FIELD_INDEX = /^slots\[(\d+)\]/;

/**
 * Errores de un 400 del servidor: mensajes por franja (índice) si los `details` se pueden mapear,
 * y el mensaje general si no hay ninguno mapeable.
 */
export function serverErrors(error) {
  const byIndex = {};
  if (Array.isArray(error.details)) {
    for (const { field, message } of error.details) {
      const match = FIELD_INDEX.exec(field ?? '');
      if (match) byIndex[Number(match[1])] ??= message;
    }
  }
  return { byIndex, general: Object.keys(byIndex).length > 0 ? null : error.message };
}
