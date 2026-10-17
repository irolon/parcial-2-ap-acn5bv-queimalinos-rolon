/**
 * Modelo de dominio: Routine + RoutineExercise.
 * Estructura, enums y helpers puros. SIN lógica de negocio ni acceso a datos.
 */

export const ROUTINES_TABLE = 'routines';
export const ROUTINE_EXERCISES_TABLE = 'routine_exercises';

/** Objetivos válidos de una rutina. */
export const ROUTINE_GOALS = ['tonify', 'weight_loss', 'hypertrophy', 'strength'];

/** Días válidos (en inglés, como en el resto del dominio). */
export const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const ROUTINE_COLUMNS =
  'id, trainer_id, student_id, template_id, name, goal, days, active, created_at';

// `order` es palabra reservada en SQL → la columna se llama order_index.
export const ROUTINE_EXERCISE_COLUMNS =
  'id, routine_id, exercise_id, sets, reps, rest_seconds, suggested_kg, tempo, notes, order_index';

/** ¿La rutina pertenece a este trainer? */
export const isOwnedBy = (routine, trainerId) => routine?.trainer_id === trainerId;

/**
 * Zona horaria del negocio. El VPS corre en UTC, pero el día que ve el alumno
 * lo define Buenos Aires: sin esto, un domingo 22:30 devuelve 'monday'.
 */
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'long',
});

/** Nombre del día actual (o de una fecha dada) en el formato del dominio. */
export const dayName = (date = new Date()) => weekdayFormatter.format(date).toLowerCase();

/** Ordena y normaliza los ejercicios embebidos de una rutina. */
export function mapRoutineExercises(routineExercises = []) {
  return routineExercises
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((re) => ({
      routine_exercise_id: re.id,
      exercise: re.exercise,
      sets: re.sets,
      reps: re.reps,
      rest_seconds: re.rest_seconds,
      suggested_kg: re.suggested_kg,
      tempo: re.tempo,
      notes: re.notes,
      order_index: re.order_index,
    }));
}

/**
 * Proyección para GET /routines/today: la rutina del día con sus ejercicios.
 * `last_session_kg` queda en null hasta que existan sesiones (Fase 3).
 */
export function toTodayRoutine(row) {
  if (!row) return null;
  const exercises = mapRoutineExercises(row.routine_exercises).map((e) => ({
    ...e,
    last_session_kg: null,
  }));
  return { routine_id: row.id, name: row.name, goal: row.goal, days: row.days, exercises };
}

/** Proyección para GET /routines/:id: la rutina completa con sus ejercicios. */
export function toRoutineDetail(row) {
  if (!row) return null;
  const { routine_exercises: re, ...routine } = row;
  return { ...routine, exercises: mapRoutineExercises(re) };
}
