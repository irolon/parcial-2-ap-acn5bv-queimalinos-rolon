/** Ids de los ejercicios de una rutina (los que el chat no tiene que ofrecer como alternativa). */
export const routineExerciseIds = (routine) => (routine?.routine_exercises ?? []).map((re) => re.exercise_id);

const hasExercise = (routine, exerciseId) => routineExerciseIds(routine).includes(exerciseId);

/**
 * La rutina que está haciendo el alumno. La sesión no se puede usar (llega al servidor al terminar),
 * así que se deduce del ejercicio actual: la de hoy si lo contiene; si no, la primera activa que lo
 * contenga (`active` viene de la más nueva a la más vieja); si ninguna, la de hoy (o null).
 */
export function pickWorkingRoutine({ today, active = [], currentExerciseId = null }) {
  if (!currentExerciseId) return today ?? null;
  if (today && hasExercise(today, currentExerciseId)) return today;
  const other = active.find((routine) => hasExercise(routine, currentExerciseId));
  return other ?? today ?? null;
}

/**
 * Los ejercicios de la rutina para n8n, por orden, con el actual marcado. Sin nombre de la
 * rutina ni notas (RNF-26: texto libre del PT). null si no hay rutina.
 */
export function toTodaysRoutine(routine, currentExerciseId = null) {
  if (!routine) return null;
  return (routine.routine_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((re) => ({
      exercise_name: re.exercise.name,
      muscle_group: re.exercise.muscle_group,
      sets: re.sets,
      reps: re.reps,
      suggested_kg: re.suggested_kg,
      is_current: Boolean(currentExerciseId) && re.exercise_id === currentExerciseId,
    }));
}
