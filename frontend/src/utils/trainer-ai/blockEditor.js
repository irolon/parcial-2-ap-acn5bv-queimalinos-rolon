import { EMPTY_ROUTINE, makeExercise } from '@/utils/routines/editorState';
import { sortDays } from '@/utils/students/routineDays';

/**
 * Estado del editor desde un bloque de la propuesta, igual que `fromTemplate`: nombre del bloque, objetivo de la
 * generación, días y ejercicios (series, reps, descanso, peso y notas). Descarta y cuenta (`missing`) los ejercicios
 * que ya no están en `exercisesById` (la biblioteca ya cargada).
 */
export function fromBlock(block, goal, exercisesById = new Map()) {
  const items = block.exercises ?? [];
  const kept = items.filter((item) => exercisesById.has(item.exercise_id));
  return {
    missing: items.length - kept.length,
    state: {
      ...EMPTY_ROUTINE,
      name: block.name ?? '',
      goal: goal ?? '',
      days: sortDays(block.days),
      exercises: kept.map((item) => makeExercise(item.exercise_id, item)),
    },
  };
}
