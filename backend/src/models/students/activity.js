/**
 * Estado de actividad de un alumno: las mismas reglas que la web (frontend/src/utils/students/activity.js)
 * y que el celular (E1), en días de calendario argentinos.
 * - disabled: dado de baja;
 * - inactive ("en riesgo"): 7 días o más sin entrenar, desde la última sesión o, si nunca entrenó, desde el alta;
 * - new: nunca entrenó y tiene menos de 7 días de alta;
 * - active: el resto.
 */
import { localDate, DAY_MS } from '../../shared/utils/dates.js';

export const INACTIVITY_DAYS = 7;

const dayNumber = (ymd) => Date.parse(`${ymd}T00:00:00Z`) / DAY_MS;

/** Días de calendario argentinos entre `iso` y `today` ('YYYY-MM-DD'). */
export const daysSince = (iso, today) => dayNumber(today) - dayNumber(localDate(iso));

/** Días sin entrenar: desde la última sesión o, si nunca entrenó, desde el alta. */
export const daysWithoutTraining = (student, today) => daysSince(student.last_session_at ?? student.created_at, today);

export function activityStatus(student, today) {
  if (student.active === false) return 'disabled';
  const days = daysWithoutTraining(student, today);
  if (days >= INACTIVITY_DAYS) return 'inactive';
  return student.last_session_at ? 'active' : 'new';
}
