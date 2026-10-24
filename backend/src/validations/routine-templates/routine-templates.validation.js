import { Errors } from '../../shared/utils/errors.js';
import { ROUTINE_GOALS, DAYS } from '../../models/routines/routine.model.js';
import {
  TEMPLATE_LEVELS,
  STRUCTURE_VERSION,
} from '../../models/routine-templates/routine-template.model.js';
import { isUuid, validateExerciseItem } from '../routines/routine-exercise.validation.js';

const MAX_EXERCISES = 50;
const isString = (v) => typeof v === 'string';
const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

/** Valida `structure` y devuelve solo version, days y exercises (saneados). */
export function validateStructure(structure, details) {
  if (!structure || typeof structure !== 'object' || Array.isArray(structure)) {
    details.push({ field: 'structure', message: 'structure debe ser un objeto' });
    return null;
  }
  if (structure.version !== STRUCTURE_VERSION) {
    details.push({ field: 'structure.version', message: `version debe ser ${STRUCTURE_VERSION}` });
  }
  const { days, exercises } = structure;
  if (
    !Array.isArray(days) ||
    days.length === 0 ||
    !days.every((d) => DAYS.includes(d)) ||
    new Set(days).size !== days.length
  ) {
    details.push({
      field: 'structure.days',
      message: `days debe ser un arreglo no vacío, sin repetidos, de: ${DAYS.join(', ')}`,
    });
  }
  let items = [];
  if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > MAX_EXERCISES) {
    details.push({
      field: 'structure.exercises',
      message: `exercises debe tener entre 1 y ${MAX_EXERCISES} ejercicios`,
    });
  } else {
    items = exercises.map((e, i) => {
      const item = validateExerciseItem(e, `structure.exercises[${i}]`, details);
      return item && { ...item, order: item.order ?? i };
    });
  }
  return { version: STRUCTURE_VERSION, days, exercises: items };
}

/** Valida una structure ya armada (p. ej. desde una rutina); lanza 400 si no cumple. */
export function assertValidStructure(structure) {
  const details = [];
  const clean = validateStructure(structure, details);
  if (details.length > 0) fail(details);
  return clean;
}

function validateName(name, details) {
  const value = isString(name) ? name.trim() : name;
  if (!isString(value) || value.length < 2 || value.length > 120) {
    details.push({ field: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' });
  }
  return value;
}

const isValidLevel = (v) => v === null || TEMPLATE_LEVELS.includes(v);
const levelMessage = `level debe ser null o uno de: ${TEMPLATE_LEVELS.join(', ')}`;
const goalMessage = `goal debe ser uno de: ${ROUTINE_GOALS.join(', ')}`;

/** Body de POST /routine-templates. */
export function validateCreateTemplate(body) {
  const details = [];
  const name = validateName(body.name, details);
  if (!ROUTINE_GOALS.includes(body.goal)) details.push({ field: 'goal', message: goalMessage });
  const level = body.level ?? null;
  if (!isValidLevel(level)) details.push({ field: 'level', message: levelMessage });
  const structure = validateStructure(body.structure, details);

  if (details.length > 0) fail(details);
  return { name, goal: body.goal, level, structure };
}

/** Body de PATCH /routine-templates/:id — al menos un campo. */
export function validateUpdateTemplate(body) {
  const details = [];
  const out = {};
  if (body.name !== undefined) out.name = validateName(body.name, details);
  if (body.goal !== undefined) {
    if (!ROUTINE_GOALS.includes(body.goal)) details.push({ field: 'goal', message: goalMessage });
    else out.goal = body.goal;
  }
  if (body.level !== undefined) {
    if (!isValidLevel(body.level)) details.push({ field: 'level', message: levelMessage });
    else out.level = body.level;
  }
  if (body.structure !== undefined) out.structure = validateStructure(body.structure, details);

  if (details.length === 0 && Object.keys(out).length === 0) {
    details.push({ field: 'body', message: 'Enviá al menos un campo para actualizar' });
  }
  if (details.length > 0) fail(details);
  return out;
}

/** Body de POST /routine-templates/from-routine. */
export function validateFromRoutine(body) {
  const details = [];
  const out = {};
  if (!isUuid(body.routine_id))
    details.push({ field: 'routine_id', message: 'routine_id inválido' });
  else out.routine_id = body.routine_id;
  if (body.name !== undefined) out.name = validateName(body.name, details);
  if (body.level !== undefined) {
    if (!isValidLevel(body.level)) details.push({ field: 'level', message: levelMessage });
    else out.level = body.level;
  }
  if (details.length > 0) fail(details);
  return out;
}

/** Body de POST /routine-templates/:id/instantiate. */
export function validateInstantiate(body) {
  const details = [];
  const out = {};
  if (!isUuid(body.student_id))
    details.push({ field: 'student_id', message: 'student_id inválido' });
  else out.student_id = body.student_id;
  if (body.name !== undefined) out.name = validateName(body.name, details);
  if (body.days !== undefined) {
    const { days } = body;
    if (
      !Array.isArray(days) ||
      days.length === 0 ||
      !days.every((d) => DAYS.includes(d)) ||
      new Set(days).size !== days.length
    ) {
      details.push({
        field: 'days',
        message: `days debe ser un arreglo no vacío, sin repetidos, de: ${DAYS.join(', ')}`,
      });
    } else out.days = days;
  }
  if (details.length > 0) fail(details);
  return out;
}

/** Filtros de GET /routine-templates. */
export function validateListQuery(query) {
  const details = [];
  const out = {};
  if (query.goal !== undefined) {
    if (!ROUTINE_GOALS.includes(query.goal)) details.push({ field: 'goal', message: goalMessage });
    else out.goal = query.goal;
  }
  if (query.level !== undefined) {
    if (!TEMPLATE_LEVELS.includes(query.level))
      details.push({ field: 'level', message: levelMessage });
    else out.level = query.level;
  }
  if (query.generated_by_ai !== undefined) {
    if (!['true', 'false'].includes(query.generated_by_ai)) {
      details.push({
        field: 'generated_by_ai',
        message: "generated_by_ai debe ser 'true' o 'false'",
      });
    } else out.generatedByAi = query.generated_by_ai === 'true';
  }
  if (details.length > 0) fail(details);
  return out;
}

/** Valida el :id de la ruta (UUID). */
export function validateIdParam(params) {
  if (!isUuid(params.id)) fail([{ field: 'id', message: 'id inválido' }]);
  return { id: params.id };
}
