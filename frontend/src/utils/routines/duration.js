import { WORK_SECONDS_PER_SET } from '@/utils/routines/defaults';

// Los campos del editor son strings del input: vacío, inválido o negativo cuenta 0.
const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const secondsOf = ({ sets, rest_seconds }) => amount(sets) * (WORK_SECONDS_PER_SET + amount(rest_seconds));

/**
 * Duración estimada de la rutina del editor en minutos: series × (45 s de trabajo + descanso) de cada ejercicio, la
 * misma cuenta que la rutina del día (`estimatedMinutes` de todayPlan.js) y el celular, así el PT y el alumno ven lo
 * mismo. Redondeado al minuto; entre 1 y 59 s da 1. Sin ejercicios o sin series da 0.
 */
export function estimateMinutes(exercises = []) {
  const seconds = (exercises ?? []).reduce((total, exercise) => total + secondsOf(exercise), 0);
  if (seconds === 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}
