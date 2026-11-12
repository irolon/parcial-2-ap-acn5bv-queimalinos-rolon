import { exerciseSets } from './workoutSets';

// Sustitución de un ejercicio en la sesión en curso (GX5, "Aplicar" del asistente): solo en la sesión de hoy, la rutina
// del PT no cambia. Como `WorkoutRepository.replaceExercise` del celular (`canReplace`: sin series registradas).

/** El ejercicio `index` se puede reemplazar: existe, la sesión no terminó y no tiene series. */
export const canReplace = (state, index) =>
  !state.finishedAt && Boolean(state.exercises[index]) && exerciseSets(state, index).length === 0;

/**
 * Reemplaza el ejercicio `index` por la alternativa `{ id, name }`. Mantiene series, reps y descanso del plan; la carga
 * sugerida y la de la última sesión quedan en null (eran del otro ejercicio). `originalExerciseId` y `originalName`
 * guardan el planificado, o quedan en null si se vuelve a él (`original.takeIf { it != replacement.id }`).
 * Con series, terminada, el mismo ejercicio o un índice que no existe, devuelve el mismo estado.
 */
export function replaceExercise(state, index, { id, name } = {}) {
  const exercise = state.exercises[index];
  if (!id || !canReplace(state, index) || exercise.exerciseId === id) return state;
  const plannedId = exercise.originalExerciseId ?? exercise.exerciseId;
  const plannedName = exercise.originalName ?? exercise.name;
  const back = plannedId === id;
  const replaced = {
    ...exercise,
    exerciseId: id,
    name: name ?? 'Ejercicio',
    originalExerciseId: back ? null : plannedId,
    originalName: back ? null : plannedName,
    suggestedKg: null,
    lastKg: null,
  };
  return { ...state, exercises: state.exercises.map((item, i) => (i === index ? replaced : item)) };
}
