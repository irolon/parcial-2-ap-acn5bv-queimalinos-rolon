const HOUR_MS = 60 * 60 * 1000;

/** Horas que le quedan a la invitación (redondeo hacia abajo, mínimo 1). */
export function hoursLeft(expiresAt, now = Date.now()) {
  const diff = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(diff)) return null;
  return Math.max(1, Math.floor(diff / HOUR_MS));
}

/** "Tomás Rivera" → "Tomás". */
export function firstName(fullName = '') {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

/** "Tomás Rivera" → "invitacion-tomas-rivera.png". */
export function qrFileName(fullName = '') {
  const slug = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `invitacion-${slug || 'alumno'}.png`;
}
