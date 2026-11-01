import { Errors } from '../../../shared/utils/errors.js';
import * as repository from '../../../repositories/routines/routines.repository.js';
import * as templatesRepository from '../../../repositories/routine-templates/routine-templates.repository.js';
import * as progressRepository from '../../../repositories/progress/progress.repository.js';
import {
  isOwnedBy,
  dayName,
  toTodayRoutine,
  toRoutineDetail,
  toStudentRoutines,
} from '../../../models/routines/routine.model.js';
import {
  assertExercisesAccessible,
  getOwnedRoutine,
} from './routine-access.service.js';

export { findMissingExerciseIds, assertExercisesAccessible } from './routine-access.service.js';
export {
  addExercises,
  updateExercise,
  removeExercise,
  reorderExercises,
} from './routine-exercises.service.js';

/**
 * Inserta la rutina y después sus ejercicios. Sin transacción entre tablas: si
 * los ejercicios fallan, se borra la rutina recién creada (compensación) y se
 * re-lanza el error original; si la compensación también falla, se loguea.
 */
export async function createWithExercises(routineFields, exercises) {
  const routine = await repository.createRoutine(routineFields);
  try {
    const created = await repository.addRoutineExercises(routine.id, exercises);
    return { ...routine, exercises: created };
  } catch (err) {
    await repository.deleteRoutine(routine.id).catch((compensationError) => {
      console.error('[ROUTINE COMPENSATION FAILED]', routine.id, compensationError);
    });
    throw err;
  }
}

/**
 * CU-04 — Crea y asigna una rutina a un alumno del trainer, con sus ejercicios.
 * Valida que el alumno, la plantilla (si viene) y cada ejercicio le pertenezcan
 * al trainer (los ejercicios también pueden ser globales).
 */
export async function create(trainerId, data) {
  const belongs = await repository.isStudentOfTrainer(data.student_id, trainerId);
  if (!belongs) throw Errors.forbidden('No podés asignarle rutinas a un alumno que no es tuyo');

  if (data.template_id) {
    // Ajena o inexistente: mismo 404, para no revelar qué ids existen.
    const template = await templatesRepository.findTemplateById(data.template_id);
    if (!template || !isOwnedBy(template, trainerId)) throw Errors.templateNotFound();
  }

  await assertExercisesAccessible(
    trainerId,
    data.exercises.map((e) => e.exercise_id)
  );

  return createWithExercises(
    {
      trainer_id: trainerId,
      student_id: data.student_id,
      template_id: data.template_id ?? null,
      name: data.name,
      goal: data.goal,
      days: data.days,
      active: true,
    },
    data.exercises
  );
}

/** Lista las rutinas del trainer (filtros opcionales por alumno / activas). */
export function list(trainerId, filters) {
  return repository.findRoutinesByTrainer({ trainerId, ...filters });
}

/** Detalle de una rutina propia del trainer, con sus ejercicios. */
export async function getById(trainerId, routineId) {
  const routine = await repository.findRoutineByIdWithExercises(routineId);
  if (!routine) throw Errors.notFound('Rutina no encontrada');
  if (!isOwnedBy(routine, trainerId)) throw Errors.forbidden('Esta rutina no es tuya');
  return toRoutineDetail(routine);
}

/** Actualiza una rutina propia del trainer (nombre, goal, días, active). */
export async function update(trainerId, routineId, fields) {
  await getOwnedRoutine(trainerId, routineId, 'modificar');
  return repository.updateRoutine(routineId, fields);
}

/** last_session_kg es un dato de ayuda: si falla, se loguea y la rutina sale con null. */
async function lastSessionKgOrEmpty(studentId, exerciseIds) {
  if (!exerciseIds.length) return {};
  try {
    return await progressRepository.fetchLastSessionKg(studentId, exerciseIds);
  } catch (error) {
    console.error('[LAST SESSION KG FAILED]', studentId, error);
    return {};
  }
}

/** Rutina del día del alumno (null si no tiene ninguna activa para hoy). */
export async function today(studentId) {
  const row = await repository.findActiveRoutineForStudentToday(studentId, dayName());
  if (!row) return null;
  // Una sola consulta para todos los ejercicios de la rutina (no una por ejercicio).
  const ids = [...new Set((row.routine_exercises ?? []).map((re) => re.exercise_id))];
  return toTodayRoutine(row, await lastSessionKgOrEmpty(studentId, ids));
}

/** Rutinas activas del alumno con sus ejercicios (caché offline de mobile). */
export async function mine(studentId) {
  return toStudentRoutines(await repository.findActiveRoutinesForStudent(studentId));
}
