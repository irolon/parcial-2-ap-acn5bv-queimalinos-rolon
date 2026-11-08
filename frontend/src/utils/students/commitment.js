import { argentinaDate, pad } from '@/utils/dates';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW = 4;
const RPE_FORMAT = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
const MONTH_FORMAT = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' });

const monthOf = (value) => {
  const { year, month } = argentinaDate(value);
  return `${year}-${pad(month)}`;
};

/** Si la sesión empezó en ese mes (`YYYY-MM`), en hora argentina. */
export const startedIn = (session, month) => monthOf(session.started_at) === month;

/** El mes en curso en hora argentina, `YYYY-MM`. */
export const currentMonth = (now = new Date()) => monthOf(now);

/** `2026-11` → `noviembre`. */
export const monthName = (month) => MONTH_FORMAT.format(new Date(`${month}-15T12:00:00Z`));

/** `7,4`. */
export const formatRpe = (n) => RPE_FORMAT.format(n);

/**
 * RPE promedio, a 1 decimal, de las sesiones terminadas del mes (por `started_at`, en hora argentina) que lo cargaron:
 * `{ average, count }`, o `null` si no hay ninguna.
 */
export function rpeAverage(sessions, month) {
  const rpes = sessions
    .filter((s) => s.finished_at && s.rpe !== null && s.rpe !== undefined && startedIn(s, month))
    .map((s) => s.rpe);
  if (rpes.length === 0) return null;
  const sum = rpes.reduce((total, rpe) => total + rpe, 0);
  return { average: Math.round((sum / rpes.length) * 10) / 10, count: rpes.length };
}

const sumVolume = (weeks) => weeks.reduce((total, w) => total + w.volume_kg, 0);

/**
 * Volumen de las 4 últimas semanas de `weekly_volume` (en orden) y su variación en % contra las 4 anteriores;
 * `deltaPct` es `null` si esas 4 no tienen volumen.
 */
export function volumeWindow(weeks) {
  const total = sumVolume(weeks.slice(-WINDOW));
  const previous = sumVolume(weeks.slice(-2 * WINDOW, -WINDOW));
  return { total, deltaPct: previous > 0 ? Math.round(((total - previous) / previous) * 100) : null };
}

const dayString = (dayNumber) => new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);

/** Del lunes de hace 7 semanas a hoy, en hora argentina: 8 filas de `weekly_volume`. */
export function eightWeeksRange(now = new Date()) {
  const { dayNumber, weekday } = argentinaDate(now);
  return { from: dayString(dayNumber - (weekday - 1) - 7 * 7), to: dayString(dayNumber) };
}
