import { Errors } from '../../shared/utils/errors.js';
import { normalizeEquipment } from '../../models/exercises/equipment.model.js';
import { LIBRARY_LIMIT } from '../../models/trainer-ai/ai-generation.model.js';
import { structureDays, structureExercises } from '../../models/routine-templates/routine-template.model.js';
import * as studentsRepository from '../../repositories/students/students.repository/students.repository.js';
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

/**
 * Equipamiento: el del body tal cual; si no viene, el de la ficha normalizado al catálogo
 * (texto libre incluido). Lo que no mapea no se descarta: va como texto en `extra`.
 * Vacío → solo bodyweight.
 */
function resolveEquipment(fromBody, fromStudent) {
  const { codes, unmapped } =
    fromBody !== undefined ? { codes: fromBody, unmapped: [] } : normalizeEquipment(fromStudent);
  return { list: codes.length > 0 ? codes : [BODYWEIGHT], extra: unmapped };
}

/** Preferencias del PT más el equipamiento de la ficha que no está en el catálogo. */
const withExtraEquipment = (preferences, extra) =>
  [preferences, extra.length > 0 ? `Equipamiento extra del gimnasio: ${extra.join(', ')}` : null]
    .filter(Boolean)
    .join('. ') || null;

const missingMessage = (field, student) =>
  student ? `${field} es obligatorio: el alumno no lo tiene cargado` : `${field} es obligatorio`;

/** Lesiones: las del alumno solo si el body no trae el campo (null explícito = sin lesiones). */
const resolveInjuries = (fromBody, student) =>
  fromBody !== undefined ? fromBody : student?.injuries?.trim() || null;

/**
 * Parámetros resueltos de la generación: el body validado y, si vino student_id, lo que
 * falte (campo ausente, no vacío) se completa con el alumno. No incluye nombre, email, nacimiento ni student_id;
 * `injuries` y `preferences` son texto libre del PT que sí viaja a la IA. El equipamiento de la ficha
 * se normaliza al catálogo y lo que no mapea se suma a `preferences`.
 */
export async function resolveParams(trainerId, body) {
  const student = body.student_id ? await getActiveStudent(trainerId, body.student_id) : null;
  const equipment = resolveEquipment(body.available_equipment, student?.gym_equipment);
  const params = {
    goal: body.goal ?? student?.goal ?? null,
    level: body.level ?? student?.level ?? null,
    frequency_per_week: body.frequency_per_week,
    session_duration_min: body.session_duration_min,
    available_equipment: equipment.list,
    injuries: resolveInjuries(body.injuries, student),
    preferences: withExtraEquipment(body.preferences, equipment.extra),
  };
  const details = ['goal', 'level']
    .filter((field) => !params[field])
    .map((field) => ({ field, message: missingMessage(field, student) }));
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return params;
}

const namesOf = (structure, byId) =>
  structureExercises(structure).map((e) => byId.get(e.exercise_id)?.name).filter(Boolean);

function toBaseTemplate(template, byId) {
  return {
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
    })),
  };
}

/**
 * Biblioteca con los ejercicios accesibles de la plantilla base primero (el filtro de
 * equipamiento o el corte alfabético podían dejarlos afuera, y la IA los copia), sin
 * repetir y dentro del tope de LIBRARY_LIMIT.
 */
async function withBaseExercises(trainerId, library, base) {
  if (!base) return library;
  const ids = [...new Set(structureExercises(base.structure).map((e) => e.exercise_id))];
  const fromBase = await contextRepository.findLibraryByIds(trainerId, ids);
  const seen = new Set(fromBase.map((e) => e.id));
  return [...fromBase, ...library.filter((e) => !seen.has(e.id))].slice(0, LIBRARY_LIMIT);
}

/**
 * Contexto para n8n: la biblioteca filtrada por equipamiento (más bodyweight y los de la base), las
 * plantillas recientes del trainer y la plantilla base (404 TEMPLATE_NOT_FOUND si es ajena).
 * Sin el nombre de las plantillas (los PT suelen ponerles el del alumno) ni las notas de sus ejercicios
 * (texto libre del PT, que puede traer datos del alumno): RNF-26.
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
    library: await withBaseExercises(trainerId, library, base),
    previous_templates: recent.map((t) => ({
      goal: t.goal,
      level: t.level,
      days: structureDays(t.structure),
      exercise_names: namesOf(t.structure, byId),
    })),
    base_template: base ? toBaseTemplate(base, byId) : null,
  };
}
