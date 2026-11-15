import { sortDays } from '@/utils/students/routineDays';
import { EMPTY_ROUTINE, makeExercise } from '@/utils/routines/editorState';

const byOrder = (exercises) => [...(exercises ?? [])].sort((a, b) => a.order_index - b.order_index);
const exerciseIdOf = (e) => e.exercise?.id ?? e.exercise_id;

/**
 * Estado del editor desde `GET /routines/:id`: cabecera y ejercicios en orden. Cada fila guarda su `routineExerciseId`
 * (el id de `routine_exercises`) para saber, al guardar, qué cambió.
 */
export function fromRoutine(detail) {
  return {
    ...EMPTY_ROUTINE,
    name: detail.name ?? '',
    goal: detail.goal ?? '',
    level: detail.level ?? '',
    days: sortDays(Array.isArray(detail.days) ? detail.days : []),
    exercises: byOrder(detail.exercises).map((e) => ({
      ...makeExercise(exerciseIdOf(e), e),
      routineExerciseId: e.routine_exercise_id,
    })),
  };
}

const num = (value) => (value === null || value === undefined || value === '' ? null : Number(value));

/** Huella de la rutina guardada (cabecera, estado y filas en orden) para saber si cambió desde que se abrió. */
export function snapshotOf(detail) {
  return JSON.stringify({
    name: detail.name,
    goal: detail.goal,
    level: detail.level ?? null,
    days: sortDays(detail.days ?? []),
    active: detail.active,
    exercises: byOrder(detail.exercises).map((e) => [
      e.routine_exercise_id, exerciseIdOf(e), num(e.sets), num(e.reps), num(e.rest_seconds), num(e.suggested_kg),
      e.tempo ?? null, e.notes ?? null,
    ]),
  });
}

/** Biblioteca + los ejercicios de la rutina que no están en ella (p. ej. uno propio que ya no se lista), para sus nombres. */
export function libraryWith(library, detail) {
  const merged = new Map(library);
  for (const e of detail?.exercises ?? []) {
    if (e.exercise && !merged.has(e.exercise.id)) merged.set(e.exercise.id, e.exercise);
  }
  return merged;
}

/** Anota en cada fila el id que le dio el servidor al darla de alta (`ids`: key de la fila → id). */
export function withSavedIds(state, ids) {
  if (!ids || ids.size === 0) return state;
  return {
    ...state,
    exercises: state.exercises.map((e) => (ids.has(e.key) ? { ...e, routineExerciseId: ids.get(e.key) } : e)),
  };
}
