import { Errors } from '../../shared/utils/errors.js';
import * as repository from '../../repositories/routine-templates/routine-templates.repository.js';
import { createWithExercises, findMissingExerciseIds } from '../routines/routines.service.js';
import * as routinesRepository from '../../repositories/routines/routines.repository.js';
import { isOwnedBy, toRoutineDetail } from '../../models/routines/routine.model.js';
import { assertValidStructure } from '../../validations/routine-templates/routine-templates.validation.js';
import {
  toTemplateSummary,
  structureFromRoutine,
  templateExerciseIds,
} from '../../models/routine-templates/routine-template.model.js';

/** Lanza 403 si algún ejercicio de la structure no es global ni del trainer. */
async function assertExercisesAccessible(trainerId, structure) {
  const missing = await findMissingExerciseIds(trainerId, templateExerciseIds(structure));
  if (missing.length > 0) throw Errors.forbidden('No podés usar ejercicios que no son tuyos');
}

/** Plantilla propia; 404 si no existe o es de otro trainer (no revela su existencia). */
export async function getOwnedTemplate(trainerId, id) {
  const template = await repository.findTemplateById(id);
  if (!template || !isOwnedBy(template, trainerId)) throw Errors.templateNotFound();
  return template;
}

/** Lista las plantillas del trainer (resumen, con filtros opcionales). */
export async function list(trainerId, filters) {
  const rows = await repository.findTemplates({ trainerId, ...filters });
  return rows.map(toTemplateSummary);
}

/** Detalle de una plantilla propia: cada ejercicio de la structure trae sus datos. */
export async function getById(trainerId, id) {
  const template = await getOwnedTemplate(trainerId, id);
  const found = await repository.findExercisesByIds(templateExerciseIds(template.structure));
  const byId = new Map(found.map((e) => [e.id, e]));
  const exercises = template.structure.exercises.map((e) => ({
    ...e,
    exercise: byId.get(e.exercise_id) ?? null,
  }));
  return { ...template, structure: { ...template.structure, exercises } };
}

/** Crea una plantilla propia; la frecuencia semanal sale de los días. */
export async function create(trainerId, data) {
  await assertExercisesAccessible(trainerId, data.structure);
  return repository.createTemplate({
    trainer_id: trainerId,
    name: data.name,
    goal: data.goal,
    level: data.level ?? null,
    frequency_per_week: data.structure.days.length,
    generated_by_ai: false,
    structure: data.structure,
  });
}

/** Guarda una rutina propia como plantilla (copia goal, días y ejercicios; `goal` del body pisa el de la rutina). */
export async function createFromRoutine(trainerId, data) {
  const row = await routinesRepository.findRoutineByIdWithExercises(data.routine_id);
  if (!row) throw Errors.notFound('Rutina no encontrada');
  if (!isOwnedBy(row, trainerId)) throw Errors.forbidden('Esta rutina no es tuya');
  const routine = toRoutineDetail(row);
  const goal = data.goal ?? routine.goal;
  if (!goal) {
    throw Errors.validation('Error de validación', [
      { field: 'goal', message: 'Elegí un objetivo para la plantilla' },
    ]);
  }
  return create(trainerId, {
    name: data.name ?? routine.name,
    goal,
    level: data.level ?? null,
    structure: assertValidStructure(structureFromRoutine(routine)),
  });
}

/** Actualiza una plantilla propia; si cambia la structure se recalcula la frecuencia. */
export async function update(trainerId, id, fields) {
  await getOwnedTemplate(trainerId, id);
  const changes = { ...fields };
  if (fields.structure) {
    await assertExercisesAccessible(trainerId, fields.structure);
    changes.frequency_per_week = fields.structure.days.length;
  }
  return repository.updateTemplate(id, changes);
}

/** Borra una plantilla propia. */
export async function remove(trainerId, id) {
  await getOwnedTemplate(trainerId, id);
  await repository.deleteTemplate(id);
}

/**
 * Crea una rutina para un alumno propio a partir de una plantilla propia.
 *
 * Es una COPIA, no una referencia viva: la rutina recibe sus propias filas de
 * routine_exercises y solo guarda `template_id` como origen. Editar o borrar la
 * plantilla después no toca las rutinas ya asignadas (ADR 0003,
 * docs/adr/0003-plantillas-se-copian.md).
 */
export async function instantiate(trainerId, templateId, data) {
  const template = await getOwnedTemplate(trainerId, templateId);
  const belongs = await routinesRepository.isStudentOfTrainer(data.student_id, trainerId);
  if (!belongs) throw Errors.forbidden('No podés asignarle rutinas a un alumno que no es tuyo');

  // Los ejercicios pudieron borrarse desde que se guardó la plantilla.
  const { structure } = template;
  const missing = await findMissingExerciseIds(trainerId, templateExerciseIds(structure));
  if (missing.length > 0) throw Errors.templateExercisesUnavailable(missing);

  const routine = await createWithExercises(
    {
      trainer_id: trainerId,
      student_id: data.student_id,
      template_id: template.id,
      name: data.name ?? template.name,
      goal: template.goal,
      days: data.days ?? structure.days,
      active: true,
    },
    structure.exercises
  );
  return toRoutineDetail(await routinesRepository.findRoutineByIdWithExercises(routine.id));
}
