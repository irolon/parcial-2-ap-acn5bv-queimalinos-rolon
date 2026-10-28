/** Días de la semana de lunes a domingo, con inicial para los selectores. */
export const DAY_OPTIONS = [
  { value: 'monday', short: 'L', label: 'Lunes' },
  { value: 'tuesday', short: 'M', label: 'Martes' },
  { value: 'wednesday', short: 'X', label: 'Miércoles' },
  { value: 'thursday', short: 'J', label: 'Jueves' },
  { value: 'friday', short: 'V', label: 'Viernes' },
  { value: 'saturday', short: 'S', label: 'Sábado' },
  { value: 'sunday', short: 'D', label: 'Domingo' },
];

/** Copia de `days` en orden de semana (lunes primero); un valor desconocido queda al final. */
export function sortDays(days = []) {
  const rank = (day) => {
    const index = DAY_OPTIONS.findIndex((d) => d.value === day);
    return index < 0 ? DAY_OPTIONS.length : index;
  };
  return [...days].sort((a, b) => rank(a) - rank(b));
}

const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));

/** Días de la rutina en español, separados por " · "; un valor desconocido se muestra tal cual. */
export function formatRoutineDays(days = []) {
  return days.map((day) => DAY_LABELS[day] ?? day).join(' · ');
}
