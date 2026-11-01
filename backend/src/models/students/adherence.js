/**
 * Adherencia de los últimos 7 días completos (de hoy-7 a hoy-1, hora argentina):
 * días asignados con al menos una sesión terminada ÷ días asignados. Hoy no
 * cuenta porque todavía no terminó. Sin rutina activa no hay plan: pct null.
 * Los días anteriores al alta del alumno (`since`) o a la rutina que asigna ese día de
 * la semana (`daySince`) no cuentan: un alumno nuevo no arranca con días "faltados".
 * Funciones puras sobre fechas locales 'YYYY-MM-DD' (ver shared/utils/dates.js).
 */
import { addDays, weekdayOf } from '../gamification/streak.js';

/** Largo de la ventana en días. */
export const ADHERENCE_WINDOW_DAYS = 7;

/** Primer día de la ventana ('YYYY-MM-DD'). */
export const adherenceWindowStart = (today) => addDays(today, -ADHERENCE_WINDOW_DAYS);

/** Días por semana de la rutina activa (días distintos). */
export const daysPerWeek = (assignedDays) => new Set(assignedDays ?? []).size;

/**
 * Días y fechas de inicio de las rutinas activas de un alumno: `routines` = [{ days, since }] (since = fecha
 * local de creación de la rutina). daySince: desde qué fecha vale cada día de la semana (la rutina más vieja
 * que lo incluye).
 */
export function scheduleOf(routines) {
  const daySince = new Map();
  for (const { days, since } of routines) {
    for (const day of days ?? []) {
      const prev = daySince.get(day);
      if (!prev || since < prev) daySince.set(day, since);
    }
  }
  return { days: [...daySince.keys()], daySince };
}

/** { assigned, done, pct } de la ventana que termina ayer. since/daySince opcionales: pisos (ver arriba). */
export function adherence7d({ assignedDays, finishedDates, today, since = null, daySince = null }) {
  const assignedSet = new Set(assignedDays ?? []);
  const trained = new Set(finishedDates ?? []);
  let assigned = 0;
  let done = 0;
  for (let day = adherenceWindowStart(today); day < today; day = addDays(day, 1)) {
    const weekday = weekdayOf(day);
    if (!assignedSet.has(weekday)) continue;
    if (since && day < since) continue;
    const from = daySince?.get(weekday);
    if (from && day < from) continue;
    assigned += 1;
    if (trained.has(day)) done += 1;
  }
  return { assigned, done, pct: assigned ? Math.round((done * 100) / assigned) : null };
}
