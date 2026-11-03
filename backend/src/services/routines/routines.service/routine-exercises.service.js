import { Errors } from '../../../shared/utils/errors.js';
import * as repository from '../../../repositories/routines/routines.repository.js';
import * as routineExercisesRepo from '../../../repositories/routines/routine-exercises.repository.js';
import { toRoutineDetail } from '../../../models/routines/routine.model.js';
import { assertExercisesAccessible, getOwnedRoutine } from './routine-access.service.js';

/** Agrega ejercicios (globales o propios) a una rutina propia del trainer. Precondición: `order` viene normalizado (0..n-1) por la validación. */
export async function addExercises(trainerId, routineId, exercises) {
  await getOwnedRoutine(trainerId, routineId, 'modificar');
  await assertExercisesAccessible(
    trainerId,
    exercises.map((e) => e.exercise_id)
  );
  // Van después de los existentes: la lista nueva ya viene renumerada 0..n-1.
  const offset = (await routineExercisesRepo.findMaxOrderIndex(routineId)) + 1;
  return repository.addRoutineExercises(
    routineId,
    exercises.map((e) => ({ ...e, order: e.order + offset }))
  );
}

/** Verifica rutina propia + que el ejercicio sea parte de ella. */
async function assertRoutineExercise(trainerId, routineId, routineExerciseId, action) {
  await getOwnedRoutine(trainerId, routineId, action);
  const found = await routineExercisesRepo.findRoutineExercise(routineId, routineExerciseId);
  if (!found) throw Errors.routineExerciseNotFound();
}

/** Edita un ejercicio de una rutina propia y devuelve el detalle recargado. */
export async function updateExercise(trainerId, routineId, routineExerciseId, fields) {
  await assertRoutineExercise(trainerId, routineId, routineExerciseId, 'modificar');
  const updated = await routineExercisesRepo.updateRoutineExercise(
    routineId,
    routineExerciseId,
    fields
  );
  if (!updated) throw Errors.routineExerciseNotFound(); // lo borraron entre el chequeo y el update
  return toRoutineDetail(await repository.findRoutineByIdWithExercises(routineId));
}

/** Quita un ejercicio de una rutina propia; 409 si es el único que le queda. */
export async function removeExercise(trainerId, routineId, routineExerciseId) {
  await assertRoutineExercise(trainerId, routineId, routineExerciseId, 'modificar');
  if ((await routineExercisesRepo.countRoutineExercises(routineId)) <= 1) {
    throw Errors.routineNeedsExercise();
  }
  await routineExercisesRepo.deleteRoutineExercise(routineExerciseId);
}

/**
 * Reordena los ejercicios de una rutina propia: `ids` tiene que ser exactamente el conjunto de
 * ejercicios de la rutina. La función SQL lo valida y guarda todo en una transacción con la rutina
 * bloqueada: nunca queda un orden a medias. Devuelve el detalle recargado.
 */
export async function reorderExercises(trainerId, routineId, ids) {
  await getOwnedRoutine(trainerId, routineId, 'modificar');
  const saved = await routineExercisesRepo.reorderRoutineExercises(routineId, ids);
  if (!saved) {
    throw Errors.validation('Error de validación', [
      {
        field: 'routine_exercise_ids',
        message: 'Tiene que incluir exactamente los ejercicios de la rutina',
      },
    ]);
  }
  return toRoutineDetail(await repository.findRoutineByIdWithExercises(routineId));
}
