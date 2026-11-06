import { buildRoutineBody } from '@/utils/routines/routineForm';
import { sortDays } from '@/utils/students/routineDays';

const FIELDS = ['exercise_id', 'sets', 'reps', 'rest_seconds', 'suggested_kg', 'notes'];
const orNull = (value) => (value === undefined || value === '' ? null : value);

/**
 * Lo que de verdad se asignó desde el editor (`state`), con la forma de un bloque de la propuesta: nombre, días y
 * ejercicios (series, reps, descanso, peso y notas) como los mandó el POST, con el nombre de `exercisesById`.
 */
export function toAssignedBlock(state, exercisesById = new Map()) {
  const body = buildRoutineBody(state, null);
  return {
    name: body.name,
    days: body.days,
    exercises: body.exercises.map((e) => ({
      exercise_id: e.exercise_id,
      exercise_name: exercisesById.get(e.exercise_id)?.name ?? null,
      sets: e.sets,
      reps: e.reps,
      rest_seconds: e.rest_seconds,
      suggested_kg: e.suggested_kg,
      notes: e.notes,
    })),
  };
}

const comparable = (block) => JSON.stringify({
  name: (block.name ?? '').trim(),
  days: sortDays(block.days ?? []),
  exercises: (block.exercises ?? []).map((e) => FIELDS.map((f) => orNull(e[f]))),
});

/** `true` si lo asignado no es igual al bloque de la propuesta (el PT lo cambió en el editor). */
export function differsFromProposal(assignedBlock, proposalBlock) {
  return comparable(assignedBlock) !== comparable(proposalBlock);
}
