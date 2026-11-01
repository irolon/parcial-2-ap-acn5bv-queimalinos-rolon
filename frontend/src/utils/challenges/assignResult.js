import { plural } from '@/utils/shared/plural';

/** Nombres conocidos entre paréntesis: ` (Lucía, Pedro)`; vacío si no se conoce ninguno. */
function names(skipped, studentsById) {
  const known = skipped.map((s) => studentsById.get(s.student_id)?.name).filter(Boolean);
  return known.length > 0 ? ` (${known.join(', ')})` : '';
}

const SKIP_REASONS = [
  ['already_active', (n) => (n === 1 ? '1 ya lo tenía activo' : `${n} ya lo tenían activo`)],
  ['not_your_student', (n) => (n === 1 ? '1 no es tu alumno' : `${n} no son tus alumnos`)],
];

/**
 * Aviso tras asignar: "Asignado a 3 alumnos · 1 ya lo tenía activo (Lucía)". Si no se creó ninguno,
 * "Ningún alumno nuevo: 2 ya lo tenían activo (…)" (nunca "Asignado a 0 alumnos").
 * @param {{ created: object[], skipped: { student_id: string, reason: string }[] }} result
 * @param {Map<string, { name: string }>} studentsById
 */
export function assignResultText({ created, skipped }, studentsById) {
  const parts = SKIP_REASONS.map(([reason, label]) => {
    const group = skipped.filter((s) => s.reason === reason);
    return group.length > 0 ? `${label(group.length)}${names(group, studentsById)}` : null;
  }).filter(Boolean);

  if (created.length === 0) return parts.length > 0 ? `Ningún alumno nuevo: ${parts.join(' · ')}` : 'Ningún alumno nuevo';
  return [`Asignado a ${plural(created.length, 'alumno', 'alumnos')}`, ...parts].join(' · ');
}
