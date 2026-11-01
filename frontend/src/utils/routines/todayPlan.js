import { formatKg } from '@/utils/progress/format';
import { DEFAULT_REPS, DEFAULT_REST_SECONDS, DEFAULT_SETS } from '@/utils/routines/defaults';
import { suggestedKg } from '@/utils/routines/suggestedKg';
import { plural } from '@/utils/shared/plural';

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

/** Cantidad de ejercicios de la rutina: "6 ejercicios" ("1 ejercicio"). */
export const exerciseCount = (exercises) => plural((exercises ?? []).length, 'ejercicio', 'ejercicios');

/** Lo que dice la tarjeta de la rutina del día: "6 EJERCICIOS · 18 SERIES · ~55 MIN". */
export function planSummary(exercises) {
  const list = exercises ?? [];
  return [
    plural(list.length, 'EJERCICIO', 'EJERCICIOS'),
    plural(totalSets(list), 'SERIE', 'SERIES'),
    `~${estimatedMinutes(list)} MIN`,
  ].join(' · ');
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

/**
 * La rutina de /mine con el `last_session_kg` de cada ejercicio tomado de la rutina del día (`today`), si es la misma
 * rutina: /mine no lo calcula. Si no es la de hoy (o no está), la devuelve como vino.
 */
export function withLastSessionKg(routine, today) {
  if (!routine || !today || today.routine_id !== routine.routine_id) return routine;
  const lastKg = new Map((today.exercises ?? []).map((item) => [item.routine_exercise_id, item.last_session_kg]));
  return {
    ...routine,
    exercises: (routine.exercises ?? []).map((item) => (
      lastKg.get(item.routine_exercise_id) == null ? item : { ...item, last_session_kg: lastKg.get(item.routine_exercise_id) }
    )),
  };
}
