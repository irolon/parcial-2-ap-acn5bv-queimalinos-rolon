import { Errors } from '../../shared/utils/errors.js';
import * as repository from '../../repositories/exercises/exercises.repository.js';
import * as studentsRepository from '../../repositories/students/students.repository.js';
import { isOwnedBy } from '../../models/exercises/exercise.model.js';

/** Lista la biblioteca visible para el trainer (globales + propios). */
export function list(trainerId, filters) {
  return repository.findExercises({ trainerId, ...filters });
}

/**
 * Biblioteca del alumno: globales + los de su entrenador. El trainer sale de la
 * fila del alumno, nunca del request: no puede ver la biblioteca de otro entrenador.
 */
export async function library(studentId) {
  const student = await studentsRepository.findStudentById(studentId);
  if (!student) throw Errors.notFound('Alumno no encontrado');
  return repository.findLibrary(student.trainer_id ?? null);
}

/** Crea un ejercicio personalizado del trainer (nunca global). */
export function create(trainerId, data) {
  return repository.createExercise({
    trainer_id: trainerId,
    name: data.name,
    muscle_group: data.muscle_group,
    equipment: data.equipment,
    description: data.description,
    video_url: data.video_url,
    is_global: false,
  });
}

/** Carga un ejercicio y verifica que el trainer sea el dueño. */
async function getOwned(trainerId, id, action) {
  const exercise = await repository.findExerciseById(id);
  if (!exercise) throw Errors.notFound('Ejercicio no encontrado');
  if (!isOwnedBy(exercise, trainerId)) {
    throw Errors.forbidden(`No podés ${action} un ejercicio que no es tuyo`);
  }
  return exercise;
}

/** Actualiza un ejercicio propio del trainer. */
export async function update(trainerId, id, fields) {
  await getOwned(trainerId, id, 'modificar');
  return repository.updateExercise(id, fields);
}

/** Elimina un ejercicio propio del trainer. */
export async function remove(trainerId, id) {
  await getOwned(trainerId, id, 'eliminar');
  await repository.deleteExercise(id);
}
