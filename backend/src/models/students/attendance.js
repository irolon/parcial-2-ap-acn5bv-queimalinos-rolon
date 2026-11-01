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

function dayStatus(day, today, trained, assigned) {
  if (trained.has(day)) return ATTENDANCE_STATUS.TRAINED;
  if (day >= today) return ATTENDANCE_STATUS.UPCOMING;
  return assigned.has(weekdayOf(day)) ? ATTENDANCE_STATUS.MISSED : ATTENDANCE_STATUS.REST;
}

/**
 * sessions: sesiones terminadas del mes como { id, date } (fecha local de started_at).
 * recordSessionIds: ids de esas sesiones con al menos un récord.
 */
export function buildAttendance({ month, today, assignedDays, sessions, recordSessionIds }) {
  const assigned = new Set(assignedDays ?? []);
  const trained = new Set(sessions.map((s) => s.date));
  const { first, next } = monthRange(month);
  const days = [];
  let assignedUntilToday = 0;
  for (let day = first; day < next; day = addDays(day, 1)) {
    days.push({ date: day, status: dayStatus(day, today, trained, assigned) });
    if (day <= today && assigned.has(weekdayOf(day))) assignedUntilToday += 1;
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
