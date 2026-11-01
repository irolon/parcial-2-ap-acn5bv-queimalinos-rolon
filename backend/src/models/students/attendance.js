/**
 * Asistencia de un mes (GET /students/:id/attendance). Funciones puras sobre fechas locales
 * 'YYYY-MM-DD' (hora argentina, ver shared/utils/dates.js).
 *
 * status de cada día:
 * - trained: al menos una sesión terminada ese día (asignado o no);
 * - missed: día asignado, anterior a hoy, sin entrenar;
 * - rest: no asignado y sin entrenar (ya pasó);
 * - upcoming: hoy sin entrenar todavía, o un día futuro.
 * Sin rutina activa no hay días asignados: los pasados son rest.
 * Los días anteriores al alta del alumno (`since`) o a la rutina que asigna ese día de la semana
 * (`daySince`) tampoco cuentan como asignados: son rest (el mismo piso que la adherencia de la lista).
 */
import { addDays, weekdayOf } from '../gamification/streak.js';

export const ATTENDANCE_STATUS = { TRAINED: 'trained', MISSED: 'missed', REST: 'rest', UPCOMING: 'upcoming' };

/** 'YYYY-MM' del mes de una fecha local. */
export const monthOf = (date) => date.slice(0, 7);

/** Primer día del mes y primer día del mes siguiente ('YYYY-MM-DD'). */
export function monthRange(month) {
  const [year, m] = month.split('-').map(Number);
  // El año siempre con 4 dígitos: la comparación de fechas del calendario es de texto.
  const pad = (n, len) => String(n).padStart(len, '0');
  const next = m === 12 ? `${pad(year + 1, 4)}-01` : `${pad(year, 4)}-${pad(m + 1, 2)}`;
  return { first: `${month}-01`, next: `${next}-01` };
}

/** El día está asignado: su día de la semana está en la rutina y no es anterior a los pisos. */
function isAssigned(day, assigned, since, daySince) {
  const weekday = weekdayOf(day);
  if (!assigned.has(weekday)) return false;
  if (since && day < since) return false;
  const from = daySince?.get(weekday);
  return !(from && day < from);
}

function dayStatus(day, today, trained, assignedDay) {
  if (trained.has(day)) return ATTENDANCE_STATUS.TRAINED;
  if (day >= today) return ATTENDANCE_STATUS.UPCOMING;
  return assignedDay ? ATTENDANCE_STATUS.MISSED : ATTENDANCE_STATUS.REST;
}

/**
 * sessions: sesiones terminadas del mes como { id, date } (fecha local de started_at).
 * recordSessionIds: ids de esas sesiones con al menos un récord.
 * since / daySince: pisos opcionales (ver arriba).
 */
export function buildAttendance({ month, today, assignedDays, sessions, recordSessionIds, since = null, daySince = null }) {
  const assigned = new Set(assignedDays ?? []);
  const trained = new Set(sessions.map((s) => s.date));
  const { first, next } = monthRange(month);
  const days = [];
  let assignedUntilToday = 0;
  for (let day = first; day < next; day = addDays(day, 1)) {
    const assignedDay = isAssigned(day, assigned, since, daySince);
    days.push({ date: day, status: dayStatus(day, today, trained, assignedDay) });
    if (day <= today && assignedDay) assignedUntilToday += 1;
  }
  const records = new Set(recordSessionIds ?? []);
  return {
    month,
    sessions: sessions.length,
    assigned_days: assignedUntilToday,
    prs: sessions.filter((s) => records.has(s.id)).length,
    days,
  };
}
