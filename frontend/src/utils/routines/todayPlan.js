import { formatKg } from '@/utils/progress/format';
import { DEFAULT_REPS, DEFAULT_REST_SECONDS, DEFAULT_SETS } from '@/utils/routines/defaults';
import { suggestedKg } from '@/utils/routines/suggestedKg';

// Lo que tarda una serie sin contar el descanso (el backend no lo informa).
const WORK_SECONDS_PER_SET = 45;

const setsOf = (exercise) => exercise.sets ?? DEFAULT_SETS;

/** Series de la rutina: la suma de las de cada ejercicio (3 si alguno no trae). */
export const totalSets = (exercises = []) => exercises.reduce((sum, exercise) => sum + setsOf(exercise), 0);

/**
 * Minutos estimados de la rutina: Σ series × (descanso + 45 s) / 60, redondeado.
 * Un descanso que no viene cuenta 90 s, igual que la cuenta regresiva de la sesión.
 */
export function estimatedMinutes(exercises = []) {
  const seconds = exercises.reduce(
    (sum, exercise) => sum + setsOf(exercise) * ((exercise.rest_seconds ?? DEFAULT_REST_SECONDS) + WORK_SECONDS_PER_SET),
    0,
  );
  return Math.round(seconds / 60);
}

/**
 * Filas de la tabla "Plan de hoy", en el orden recibido: número desde 1, nombre, `setsReps` ("4 × 10")
 * y el peso sugerido (`suggestedKg`): el de la última sesión y, si no hay, el del entrenador, campo por campo y con
 * 0 kg = sin peso (peso corporal). `suggestedLabel` es "—" sin peso.
 */
export function planRows(exercises = []) {
  return exercises.map((exercise, index) => {
    const kg = suggestedKg(exercise);
    return {
      id: exercise.routine_exercise_id,
      position: index + 1,
      name: exercise.exercise?.name ?? 'Ejercicio',
      setsReps: `${setsOf(exercise)} × ${exercise.reps ?? DEFAULT_REPS}`,
      suggestedKg: kg,
      suggestedLabel: kg === null ? '—' : formatKg(kg),
    };
  });
}
