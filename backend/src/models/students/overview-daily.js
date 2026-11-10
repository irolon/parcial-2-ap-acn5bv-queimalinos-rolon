/**
 * Gráfico de actividad del Inicio del entrenador (campo `daily` de GET /students/overview): sesiones
 * terminadas por día, de hoy − (days − 1) a hoy. Cuenta por el día argentino de `finished_at`, el mismo
 * criterio que `sessions_today.done` (una que empezó ayer a las 23:30 y terminó hoy cuenta hoy).
 */
import { addDays } from '../gamification/streak.js';
import { localDate } from '../../shared/utils/dates/dates.js';

/** Días del gráfico: los 14 que ya carga el service para la adherencia. */
export const DAILY_DAYS = 14;

/**
 * sessions: terminadas, con { finished_at } (de todos los alumnos activos). today: 'YYYY-MM-DD' AR.
 * Devuelve `days` filas { date, count } ascendentes; los días sin sesiones van en 0.
 */
export function dailySessions(sessions, today, days = DAILY_DAYS) {
  const counts = new Map();
  for (let i = days - 1; i >= 0; i--) counts.set(addDays(today, -i), 0);
  for (const s of sessions) {
    const day = localDate(s.finished_at);
    if (counts.has(day)) counts.set(day, counts.get(day) + 1);
  }
  return [...counts].map(([date, count]) => ({ date, count }));
}
