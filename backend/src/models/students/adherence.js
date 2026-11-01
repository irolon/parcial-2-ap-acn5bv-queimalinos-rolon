/**
 * Adherencia de los últimos 7 días completos (de hoy-7 a hoy-1, hora argentina):
 * días asignados con al menos una sesión terminada ÷ días asignados. Hoy no
 * cuenta porque todavía no terminó. Sin rutina activa no hay plan: pct null.
 * Funciones puras sobre fechas locales 'YYYY-MM-DD' (ver shared/utils/dates.js).
 */
import { addDays, weekdayOf } from '../gamification/streak.js';

/** Largo de la ventana en días. */
export const ADHERENCE_WINDOW_DAYS = 7;

/** Primer día de la ventana ('YYYY-MM-DD'). */
export const adherenceWindowStart = (today) => addDays(today, -ADHERENCE_WINDOW_DAYS);

/** Días por semana de la rutina activa (días distintos). */
export const daysPerWeek = (assignedDays) => new Set(assignedDays ?? []).size;

/** { assigned, done, pct } de la ventana que termina ayer. */
export function adherence7d({ assignedDays, finishedDates, today }) {
  const assignedSet = new Set(assignedDays ?? []);
  const trained = new Set(finishedDates ?? []);
  let assigned = 0;
  let done = 0;
  for (let day = adherenceWindowStart(today); day < today; day = addDays(day, 1)) {
    if (!assignedSet.has(weekdayOf(day))) continue;
    assigned += 1;
    if (trained.has(day)) done += 1;
  }
  return { assigned, done, pct: assigned ? Math.round((done * 100) / assigned) : null };
}
