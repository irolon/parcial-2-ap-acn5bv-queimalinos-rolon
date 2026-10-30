export const point = (day, e1rm) => ({
  date: `2026-10-${String(day).padStart(2, '0')}`,
  max_kg: e1rm - 10,
  volume_kg: e1rm * 10,
  e1rm_kg: e1rm,
  sets: 3,
  reps: 30,
});

export const curveData = (points) => ({
  exercise: { id: 1, name: 'Press banca', muscle_group: 'pecho' },
  points,
  pr: { max_kg: { value: 90, date: '2026-10-20' }, e1rm_kg: { value: 100, date: '2026-10-20' } },
  default_metric: 'e1rm_kg',
});

export const SIX = [1, 5, 10, 15, 20, 25].map((d, i) => point(d, 90 + i * 2));

export const week = (day, volume_kg, sessions) => ({ week_start: `2026-10-${day}`, volume_kg, sessions });
