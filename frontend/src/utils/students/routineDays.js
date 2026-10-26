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

const DAY_LABELS = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));

/** Días de la rutina en español, separados por " · "; un valor desconocido se muestra tal cual. */
export function formatRoutineDays(days = []) {
  return days.map((day) => DAY_LABELS[day] ?? day).join(' · ');
}
