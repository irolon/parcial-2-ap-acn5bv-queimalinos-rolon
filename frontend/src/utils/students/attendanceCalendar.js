import { argentinaDate, pad } from '@/utils/dates';
import { currentMonth, monthName } from './commitment';

/** Primer mes que acepta `GET /students/:id/attendance`. */
export const MIN_MONTH = '2020-01';

const LABELS = { trained: 'entrenó', missed: 'faltó', rest: 'descanso', upcoming: 'por venir' };

const parse = (month) => month.split('-').map(Number);

/**
 * Celdas de la grilla de 7 columnas que empieza el lunes: `null` por cada hueco antes del día 1 y después
 * `{ day, date, status }` por día (`status` de `days`, o `null` si el servidor no lo mandó).
 */
export function calendarCells(month, days) {
  const [year, m] = parse(month);
  const status = new Map(days.map((d) => [d.date, d.status]));
  const blanks = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const cells = Array.from({ length }, (_, i) => {
    const date = `${month}-${pad(i + 1)}`;
    return { day: i + 1, date, status: status.get(date) ?? null };
  });
  return [...Array(blanks).fill(null), ...cells];
}

/** `2026-01` corrido `delta` meses: `shiftMonth('2026-01', -1)` = `2025-12`. */
export function shiftMonth(month, delta) {
  const [year, m] = parse(month);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** Piso de la navegación: el mes del alta (hora argentina), entre MIN_MONTH y el actual; sin alta, el actual. */
export function firstMonth(createdAt, current) {
  if (!createdAt) return current;
  const month = currentMonth(new Date(createdAt));
  if (month < MIN_MONTH) return MIN_MONTH;
  return month > current ? current : month;
}

export const canGoPrev = (month, floor) => month > floor;

export const canGoNext = (month, current) => month < current;

/** "Asistencia · noviembre", con el año si no es el del mes actual: "Asistencia · octubre 2025". */
export function attendanceTitle(month, current) {
  const name = monthName(month);
  return month.slice(0, 4) === current.slice(0, 4) ? `Asistencia · ${name}` : `Asistencia · ${name} ${month.slice(0, 4)}`;
}

/** Lo que se lee de cada día: "entrenó", "faltó", "descanso", "por venir". */
export const dayLabel = (status) => LABELS[status] ?? 'sin datos';

/** `YYYY-MM-DD` de un instante en hora argentina. */
export function isoDay(now) {
  const { year, month, day } = argentinaDate(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}
