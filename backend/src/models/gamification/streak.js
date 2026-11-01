/**
 * Racha y semanas completas. Funciones puras: reciben fechas locales
 * 'YYYY-MM-DD' (ver shared/utils/dates.js) y devuelven números. La aritmética
 * de fechas se hace sobre Date en UTC-medianoche para no depender del TZ del server.
 */
import { DAYS } from '../routines/routine.model.js';
import { DAY_MS } from '../../shared/utils/dates.js';

/** Forma pública de la racha (fila de student_streaks o la calculada): la usan /streak y el progreso. */
export const toStreakView = (row) => ({
  current_streak_days: row.current_days,
  longest_streak_days: row.longest_days,
  last_session_date: row.last_trained_date,
});

const toUtc = (str) => new Date(`${str}T00:00:00Z`);

/** Suma (o resta) días a una fecha 'YYYY-MM-DD'. */
export const addDays = (str, n) =>
  new Date(toUtc(str).getTime() + n * DAY_MS).toISOString().slice(0, 10);

/** Nombre del día de la semana ('sunday'…'saturday') de una fecha 'YYYY-MM-DD'. */
export const weekdayOf = (str) => DAYS[toUtc(str).getUTCDay()];

/** Lunes de la semana de una fecha. */
const mondayOf = (str) => addDays(str, -((toUtc(str).getUTCDay() + 6) % 7));

/** Conjunto de días asignados; sin rutina activa (vacío) todos los días lo son. */
const assignedSet = (assignedDays) => new Set(assignedDays?.length ? assignedDays : DAYS);

/**
 * Días asignados que se salteó el alumno: los que van desde el día siguiente a
 * `lastDate` hasta ayer (hoy todavía no terminó). Vacío = todos los días.
 */
export function missedAssignedDays({ lastDate, assignedDays, today }) {
  const assigned = assignedSet(assignedDays);
  let missed = 0;
  for (let day = addDays(lastDate, 1); day < today; day = addDays(day, 1)) {
    if (assigned.has(weekdayOf(day))) missed += 1;
  }
  return missed;
}

/**
 * Racha contra los días asignados.
 * - Día entrenado: suma 1 (esté o no asignado).
 * - Día asignado sin entrenar: corta, salvo hoy (todavía no terminó).
 * - Día no asignado sin entrenar: se saltea.
 * `longest_days` recorre toda la historia con la misma regla.
 */
export function computeStreak({ trainedDates, assignedDays, today }) {
  const trained = new Set((trainedDates ?? []).filter((d) => d <= today));
  if (trained.size === 0) {
    return { current_days: 0, longest_days: 0, last_trained_date: null };
  }
  const sorted = [...trained].sort();
  const first = sorted[0];
  const assigned = assignedSet(assignedDays);

  // Qué hace un día: 'add' (suma), 'cut' (corta) o 'skip' (no cambia).
  const step = (day) => {
    if (trained.has(day)) return 'add';
    if (day === today) return 'skip';
    return assigned.has(weekdayOf(day)) ? 'cut' : 'skip';
  };

  let current = 0;
  for (let day = today; day >= first; day = addDays(day, -1)) {
    const result = step(day);
    if (result === 'cut') break;
    if (result === 'add') current += 1;
  }

  let longest = 0;
  let run = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    const result = step(day);
    if (result === 'cut') run = 0;
    if (result === 'add') run += 1;
    longest = Math.max(longest, run);
  }

  return {
    current_days: current,
    longest_days: longest,
    last_trained_date: sorted[sorted.length - 1],
  };
}

/**
 * Semanas (lunes–domingo) en las que se entrenaron TODOS los días asignados.
 * La semana actual cuenta solo si ya se cumplieron todos (incluidos los
 * futuros, o sea que solo si todos son <= hoy). Sin días asignados → 0.
 */
export function countFullWeeks({ trainedDates, assignedDays, today }) {
  if (!assignedDays?.length) return 0;
  const trained = new Set((trainedDates ?? []).filter((d) => d <= today));
  if (trained.size === 0) return 0;

  const wanted = new Set(assignedDays);
  const firstMonday = mondayOf([...trained].sort()[0]);
  const lastMonday = mondayOf(today);
  let weeks = 0;
  for (let monday = firstMonday; monday <= lastMonday; monday = addDays(monday, 7)) {
    const required = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) =>
      wanted.has(weekdayOf(d))
    );
    if (required.length > 0 && required.every((d) => trained.has(d))) weeks += 1;
  }
  return weeks;
}
