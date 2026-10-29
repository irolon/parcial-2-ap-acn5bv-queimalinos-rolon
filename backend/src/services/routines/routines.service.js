import { Errors } from '../../shared/utils/errors.js';
import * as repository from '../../repositories/routines/routines.repository.js';
import * as templatesRepository from '../../repositories/routine-templates/routine-templates.repository.js';
import * as routineExercisesRepo from '../../repositories/routines/routine-exercises.repository.js';
import * as progressRepository from '../../repositories/progress/progress.repository.js';
import {
  isOwnedBy,
  dayName,
  toTodayRoutine,
  toRoutineDetail,
  toStudentRoutines,
} from '../../models/routines/routine.model.js';

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
async function getOwnedRoutine(trainerId, routineId, action) {
  const routine = await repository.findRoutineById(routineId);
  if (!routine) throw Errors.notFound('Rutina no encontrada');
  if (!isOwnedBy(routine, trainerId)) {
    throw Errors.forbidden(`No podés ${action} una rutina que no es tuya`);
  }
  return routine;
}

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

/** Rutina del día del alumno (null si no tiene ninguna activa para hoy). */
export async function today(studentId) {
  const row = await repository.findActiveRoutineForStudentToday(studentId, dayName());
  if (!row) return null;
  // Una sola consulta para todos los ejercicios de la rutina (no una por ejercicio).
  const ids = [...new Set((row.routine_exercises ?? []).map((re) => re.exercise_id))];
  const lastKg = ids.length ? await progressRepository.fetchLastSessionKg(studentId, ids) : {};
  return toTodayRoutine(row, lastKg);
}

/** Rutinas activas del alumno con sus ejercicios (caché offline de mobile). */
export async function mine(studentId) {
  return toStudentRoutines(await repository.findActiveRoutinesForStudent(studentId));
}
