import { Errors } from '../../shared/utils/errors.js';
import * as repository from '../../repositories/routines/routines.repository.js';
import {
  isOwnedBy,
  dayName,
  toTodayRoutine,
  toRoutineDetail,
  toStudentRoutines,
} from '../../models/routines/routine.model.js';

/**
 * Verifica que cada ejercicio sea global o del trainer. Los inexistentes
 * también se rechazan con 403, para no revelar qué ids existen.
 */
async function assertExercisesAccessible(trainerId, exercises) {
  const ids = [...new Set(exercises.map((e) => e.exercise_id))];
  if (ids.length === 0) return;
  const accessible = new Set(await repository.findAccessibleExerciseIds(ids, trainerId));
  if (ids.some((id) => !accessible.has(id))) {
    throw Errors.forbidden('No podés usar ejercicios que no son tuyos');
  }
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
 * CU-04 — Crea y asigna una rutina a un alumno del trainer, con sus ejercicios.
 * Valida que el alumno, la plantilla (si viene) y cada ejercicio le pertenezcan
 * al trainer (los ejercicios también pueden ser globales).
 */
export async function create(trainerId, data) {
  const belongs = await repository.isStudentOfTrainer(data.student_id, trainerId);
  if (!belongs) throw Errors.forbidden('No podés asignarle rutinas a un alumno que no es tuyo');

  if (data.template_id) {
    const template = await repository.findTemplateById(data.template_id);
    if (!template) throw Errors.notFound('Plantilla no encontrada');
    if (!isOwnedBy(template, trainerId)) {
      throw Errors.forbidden('No podés usar una plantilla que no es tuya');
    }
  }

  await assertExercisesAccessible(trainerId, data.exercises);

  const routine = await repository.createRoutine({
    trainer_id: trainerId,
    student_id: data.student_id,
    template_id: data.template_id ?? null,
    name: data.name,
    goal: data.goal,
    days: data.days,
    active: true,
  });

  const exercises = await repository.addRoutineExercises(routine.id, data.exercises);
  return { ...routine, exercises };
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

/** Agrega ejercicios (globales o propios) a una rutina propia del trainer. */
export async function addExercises(trainerId, routineId, exercises) {
  await getOwnedRoutine(trainerId, routineId, 'modificar');
  await assertExercisesAccessible(trainerId, exercises);
  return repository.addRoutineExercises(routineId, exercises);
}

/** Rutina del día del alumno (null si no tiene ninguna activa para hoy). */
export async function today(studentId) {
  const row = await repository.findActiveRoutineForStudentToday(studentId, dayName());
  return toTodayRoutine(row);
}

/** Rutinas activas del alumno con sus ejercicios (caché offline de mobile). */
export async function mine(studentId) {
  return toStudentRoutines(await repository.findActiveRoutinesForStudent(studentId));
}
