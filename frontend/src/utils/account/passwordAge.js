import { plural } from '@/utils/shared/plural';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Modificada hace 3 días" / "hace 2 meses" / "Nunca la cambiaste", a partir de `password_changed_at`. */
export function passwordAgeLabel(changedAt, now = new Date()) {
  if (!changedAt) return 'Nunca la cambiaste';
  const days = Math.max(0, Math.floor((now.getTime() - new Date(changedAt).getTime()) / DAY_MS));
  if (days < 1) return 'Modificada hoy';
  if (days < 60) return `Modificada hace ${plural(days, 'día', 'días')}`;
  return `Modificada hace ${plural(Math.floor(days / 30), 'mes', 'meses')}`;
}
