/** Segundos que se estiman por repetición. */
export const SECONDS_PER_REP = 3;

// Los campos del editor son strings del input: vacío, inválido o negativo cuenta 0.
const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const secondsOf = ({ sets, reps, rest_seconds }) =>
  amount(sets) * (amount(reps) * SECONDS_PER_REP + amount(rest_seconds));

/**
 * Duración estimada de la rutina en minutos: series × (repeticiones × 3 s + descanso) de cada ejercicio, redondeado al
 * minuto. Entre 1 y 59 s da 1 (no se muestra "~0 min" con algo cargado); sin ejercicios o sin tiempo da 0.
 */
export function estimateMinutes(exercises = []) {
  const seconds = exercises.reduce((total, exercise) => total + secondsOf(exercise), 0);
  if (seconds === 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}
