const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

/** `22 ABR` (hora local) para el ISO de inicio de una sesión. */
export function formatSessionDate(iso) {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** `54′` (prima, U+2032) para minutos; `—` sin duración. */
export const formatDuration = (min) => (min == null ? '—' : `${min}\u2032`);
