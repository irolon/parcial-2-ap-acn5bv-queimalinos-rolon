import { formatClock } from './workoutFormat';

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** `22 ABR` (hora local) para el ISO de inicio de una sesión. */
export function formatSessionDate(iso) {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** `54′` (prima, U+2032) para minutos; `—` sin duración. */
export const formatDuration = (min) => (min == null ? '—' : `${min}\u2032`);

/**
 * Descanso real de una serie del historial contra el del plan, como el celular (HistoryTexts.kt, `setLine`):
 * `{ rest: '2:00', plan: '1:30' }` si difieren; `plan: null` si coinciden o no hay plan; null sin descanso registrado.
 */
export function restVsPlan(restSeconds, plannedSeconds) {
  if (!Number.isFinite(restSeconds)) return null;
  const differs = Number.isFinite(plannedSeconds) && plannedSeconds !== restSeconds;
  return { rest: formatClock(restSeconds), plan: differs ? formatClock(plannedSeconds) : null };
}

