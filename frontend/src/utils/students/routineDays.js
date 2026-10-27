const DAY_LABELS = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

/** Días de la rutina en español, separados por " · "; un valor desconocido se muestra tal cual. */
export function formatRoutineDays(days = []) {
  return days.map((day) => DAY_LABELS[day] ?? day).join(' · ');
}
