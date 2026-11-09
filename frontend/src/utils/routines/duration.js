import { routineSeconds } from '@/utils/routines/todayPlan';

// Los campos del editor son strings del input: vacío, inválido o negativo cuenta 0 (no el valor por defecto, que
// usaría la rutina del día si el dato no viniera: en el editor un campo vacío todavía no es nada).
const amount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

/**
 * Duración estimada de la rutina del editor en minutos, con la misma cuenta que la rutina del día (`routineSeconds`
 * de todayPlan.js, igual que el celular): series × (45 s de trabajo + descanso). Redondeado al minuto; entre 1 y 59 s
 * da 1 (en el editor no se muestra "~0 min" con algo cargado). Sin ejercicios o sin series da 0.
 */
export function estimateMinutes(exercises = []) {
  const seconds = routineSeconds(
    (exercises ?? []).map(({ sets, rest_seconds }) => ({ sets: amount(sets), rest_seconds: amount(rest_seconds) })),
  );
  if (seconds === 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}
