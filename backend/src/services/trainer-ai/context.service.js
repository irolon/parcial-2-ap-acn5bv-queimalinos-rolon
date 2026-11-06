import { Errors } from '../../shared/utils/errors.js';
import { EQUIPMENT } from '../../models/exercises/exercise.model.js';
import { structureDays, structureExercises } from '../../models/routine-templates/routine-template.model.js';
import * as studentsRepository from '../../repositories/students/students.repository.js';
import * as contextRepository from '../../repositories/trainer-ai/ai-context.repository.js';
import * as templatesRepository from '../../repositories/routine-templates/routine-templates.repository.js';
import { getOwnedTemplate } from '../routine-templates/routine-templates.service.js';

const BODYWEIGHT = 'bodyweight';

/** Alumno activo del trainer; 404 STUDENT_NOT_FOUND si no existe, es ajeno o está dado de baja. */
async function getActiveStudent(trainerId, studentId) {
  const student = await studentsRepository.findStudentById(studentId);
  if (!student || student.trainer_id !== trainerId || !student.active) throw Errors.studentNotFound();
  return student;
}

/** Equipamiento válido sin repetidos; vacío → solo bodyweight. */
function resolveEquipment(fromBody, fromStudent) {
  const list = fromBody ?? [...new Set((fromStudent ?? []).filter((e) => EQUIPMENT.includes(e)))];
  return list.length > 0 ? list : [BODYWEIGHT];
}

/**
 * Parámetros resueltos de la generación: el body validado y, si vino student_id, lo que
 * falte se completa con el alumno. Nunca incluye datos personales (nombre, email, nacimiento).
 */
export async function resolveParams(trainerId, body) {
  const student = body.student_id ? await getActiveStudent(trainerId, body.student_id) : null;
  const params = {
    goal: body.goal ?? student?.goal ?? null,
    level: body.level ?? student?.level ?? null,
    frequency_per_week: body.frequency_per_week,
    session_duration_min: body.session_duration_min,
    available_equipment: resolveEquipment(body.available_equipment, student?.gym_equipment),
    injuries: body.injuries ?? (student?.injuries?.trim() || null),
    preferences: body.preferences ?? null,
  };
  const details = ['goal', 'level']
    .filter((field) => !params[field])
    .map((field) => ({ field, message: `${field} es obligatorio: el alumno no lo tiene cargado` }));
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return params;
}

const namesOf = (structure, byId) =>
  structureExercises(structure).map((e) => byId.get(e.exercise_id)?.name).filter(Boolean);

function toBaseTemplate(template, byId) {
  return {
    name: template.name,
    goal: template.goal,
    level: template.level,
    days: structureDays(template.structure),
    exercises: structureExercises(template.structure).map((e) => ({
      exercise_id: e.exercise_id,
      exercise_name: byId.get(e.exercise_id)?.name ?? null,
      sets: e.sets,
      reps: e.reps,
      rest_seconds: e.rest_seconds ?? null,
      suggested_kg: e.suggested_kg ?? null,
      notes: e.notes ?? null,
    })),
  };
}

/**
 * Contexto para n8n: la biblioteca filtrada por equipamiento (más bodyweight), las
 * plantillas recientes del trainer y la plantilla base (404 TEMPLATE_NOT_FOUND si es ajena).
 */
export async function buildContext(trainerId, params, baseTemplateId) {
  const equipment = [...new Set([...params.available_equipment, BODYWEIGHT])];
  const [library, recent, base] = await Promise.all([
    contextRepository.findLibraryForEquipment(trainerId, equipment),
    contextRepository.findRecentTemplates(trainerId),
    baseTemplateId ? getOwnedTemplate(trainerId, baseTemplateId) : null,
  ]);
  const ids = [...recent, ...(base ? [base] : [])].flatMap((t) =>
    structureExercises(t.structure).map((e) => e.exercise_id)
  );
  const found = ids.length > 0 ? await templatesRepository.findExercisesByIds([...new Set(ids)]) : [];
  const byId = new Map(found.map((e) => [e.id, e]));
  return {
    library,
    previous_templates: recent.map((t) => ({
      name: t.name,
      goal: t.goal,
      level: t.level,
      days: structureDays(t.structure),
      exercise_names: namesOf(t.structure, byId),
    })),
    base_template: base ? toBaseTemplate(base, byId) : null,
  };
}
