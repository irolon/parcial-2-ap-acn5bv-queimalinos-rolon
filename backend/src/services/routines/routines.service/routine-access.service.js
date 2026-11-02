import { Errors } from '../../../shared/utils/errors.js';
import * as repository from '../../../repositories/routines/routines.repository.js';
import { isOwnedBy } from '../../../models/routines/routine.model.js';

/**
 * Ids (sin repetir y en el orden recibido) que no son globales ni del trainer.
 * Los inexistentes también cuentan como faltantes: así nunca se revela qué ids existen.
 */
export async function findMissingExerciseIds(trainerId, ids) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const accessible = new Set(await repository.findAccessibleExerciseIds(unique, trainerId));
  return unique.filter((id) => !accessible.has(id));
}

/** Lanza 403 si algún ejercicio (por id) no es global ni del trainer. */
export async function assertExercisesAccessible(trainerId, exerciseIds) {
  const missing = await findMissingExerciseIds(trainerId, exerciseIds);
  if (missing.length > 0) throw Errors.forbidden('No podés usar ejercicios que no son tuyos');
}

/** Verifica que la rutina exista y sea del trainer. */
export async function getOwnedRoutine(trainerId, routineId, action) {
  const routine = await repository.findRoutineById(routineId);
  if (!routine) throw Errors.notFound('Rutina no encontrada');
  if (!isOwnedBy(routine, trainerId)) {
    throw Errors.forbidden(`No podés ${action} una rutina que no es tuya`);
  }
  return routine;
}
