export const INACTIVITY_DAYS = 7;

export const STATUS_LABELS = { active: 'Al día', inactive: 'Inactivo', new: 'Nuevo', disabled: 'Dado de baja' };

const DAY_MS = 24 * 60 * 60 * 1000;

// Número de día del calendario local; con `Date.UTC` los cambios de horario no corren la cuenta.
const dayNumber = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;

/** Días de calendario (zona local) entre `iso` y `now`: ayer a las 23 visto hoy a las 8 es 1. */
export function daysSince(iso, now) {
  return dayNumber(now) - dayNumber(new Date(iso));
}

/** Días sin entrenar: desde la última sesión o, si nunca entrenó, desde el alta. */
export const daysWithoutTraining = (student, now) => daysSince(student.last_session_at ?? student.created_at, now);

/** 'active' | 'inactive' | 'new' | 'disabled' según baja, última sesión y alta. */
export function activityStatus(student, now) {
  if (student.active === false) return 'disabled';
  if (student.last_session_at) {
    return daysSince(student.last_session_at, now) >= INACTIVITY_DAYS ? 'inactive' : 'active';
  }
  return daysSince(student.created_at, now) >= INACTIVITY_DAYS ? 'inactive' : 'new';
}

/** Cuántos alumnos hay en cada estado: `{ active, inactive, new, disabled }`. */
export function countByStatus(students, now) {
  const counts = { active: 0, inactive: 0, new: 0, disabled: 0 };
  for (const s of students) counts[activityStatus(s, now)] += 1;
  return counts;
}

export function lastSessionLabel(student, now) {
  if (!student.last_session_at) return 'Nunca entrenó';
  const days = daysSince(student.last_session_at, now);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
