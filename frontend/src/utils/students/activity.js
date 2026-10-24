export const INACTIVITY_DAYS = 7;

export const STATUS_LABELS = { active: 'Al día', inactive: 'Inactivo', new: 'Nuevo', disabled: 'Dado de baja' };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días enteros transcurridos entre `iso` y `now`. */
export function daysSince(iso, now) {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

/** 'active' | 'inactive' | 'new' | 'disabled' según baja, última sesión y alta. */
export function activityStatus(student, now) {
  if (student.active === false) return 'disabled';
  if (student.last_session_at) {
    return daysSince(student.last_session_at, now) >= INACTIVITY_DAYS ? 'inactive' : 'active';
  }
  return daysSince(student.created_at, now) >= INACTIVITY_DAYS ? 'inactive' : 'new';
}

export function lastSessionLabel(student, now) {
  if (!student.last_session_at) return 'Nunca entrenó';
  const days = daysSince(student.last_session_at, now);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
