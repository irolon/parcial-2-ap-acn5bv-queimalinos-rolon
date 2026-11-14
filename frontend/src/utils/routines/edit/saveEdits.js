import { planEdits } from './planEdits';

/**
 * Guarda los cambios del editor sobre una rutina asignada con los endpoints de a uno, en este orden:
 * cabecera → altas → cambios → bajas → orden final. Las altas van antes que las bajas para que reemplazar el único
 * ejercicio no choque con el 409 `ROUTINE_NEEDS_EXERCISE`; el orden final es atómico en el servidor.
 *
 * `api`: `{ updateRoutine, addRoutineExercises, updateRoutineExercise, removeRoutineExercise, reorderRoutineExercises }`.
 * Devuelve `{ plan, ids }` (`ids`: key de cada fila dada de alta → su id nuevo). Si un paso falla, lo anterior queda
 * guardado y el error sale con `savedIds` (los ids ya asignados) para que reintentar mande solo lo que falta.
 */
export async function saveEdits(routineId, detail, state, api) {
  const plan = planEdits(detail, state);
  const ids = new Map();
  try {
    if (plan.header) await api.updateRoutine(routineId, plan.header);
    if (plan.adds.length) {
      const created = await api.addRoutineExercises(routineId, plan.adds.map((a) => a.body));
      // El servidor las pone al final en el orden recibido: por `order_index` se sabe cuál es cuál.
      const sorted = [...created].sort((a, b) => a.order_index - b.order_index);
      plan.adds.forEach((add, index) => ids.set(add.key, sorted[index].id));
    }
    for (const update of plan.updates) await api.updateRoutineExercise(routineId, update.id, update.body);
    for (const id of plan.removes) await api.removeRoutineExercise(routineId, id);
    if (plan.reorder) {
      await api.reorderRoutineExercises(routineId, state.exercises.map((e) => ids.get(e.key) ?? e.routineExerciseId));
    }
  } catch (error) {
    error.savedIds = ids;
    throw error;
  }
  return { plan, ids };
}
