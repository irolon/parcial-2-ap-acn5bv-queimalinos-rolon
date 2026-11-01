import { pad } from '@/utils/dates';

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const hourLabel = (hour) => `${pad(hour)}:00`;

/** Opciones de hora en punto `from`..`to` (inclusive) para un select. */
export const hourOptions = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: hourLabel(from + i) }));

/** El backend devuelve `HH:MM:SS`; el formulario trabaja con `HH:00`. */
export const normalizeSlots = (slots) =>
  slots.map(({ weekday, start_time, end_time }) => ({
    weekday,
    start_time: start_time.slice(0, 5),
    end_time: end_time.slice(0, 5),
  }));

const FIELD_INDEX = /^slots\[(\d+)\]$/;

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
