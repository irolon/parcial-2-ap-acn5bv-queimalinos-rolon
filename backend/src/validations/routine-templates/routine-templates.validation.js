import { Errors } from '../../shared/utils/errors.js';
import { ROUTINE_GOALS } from '../../models/routines/routine.model.js';
import {
  TEMPLATE_LEVELS,
  STRUCTURE_VERSION,
} from '../../models/routine-templates/routine-template.model.js';
import {
  isUuid,
  validateExerciseItem,
  normalizeExerciseOrder,
} from '../routines/routine-exercise.validation.js';
import { validateDays } from '../routines/routines.validation.js';

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
  validateDays(days, 'structure.days', details);
  let items = [];
  if (!Array.isArray(exercises) || exercises.length === 0 || exercises.length > MAX_EXERCISES) {
    details.push({
      field: 'structure.exercises',
      message: `exercises debe tener entre 1 y ${MAX_EXERCISES} ejercicios`,
    });
  } else {
    items = exercises.map((e, i) =>
      validateExerciseItem(e, `structure.exercises[${i}]`, details)
    );
    if (items.every(Boolean)) items = normalizeExerciseOrder(items);
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

const goalMessage = `goal debe ser uno de: ${ROUTINE_GOALS.join(', ')}`;
const levelMessage = `level debe ser null o uno de: ${TEMPLATE_LEVELS.join(', ')}`;
const GOAL = [ROUTINE_GOALS, 'goal', goalMessage];
const LEVEL = [[...TEMPLATE_LEVELS, null], 'level', levelMessage];

/**
 * Si `value` viene (no es undefined), lo valida contra `allowed` y lo guarda en
 * `out[field]`; si no, agrega el error a `details`.
 */
function optionalEnum(value, [allowed, field, message], out, details) {
  if (value === undefined) return;
  if (!allowed.includes(value)) details.push({ field, message });
  else out[field] = value;
}

/** Body de POST /routine-templates. */
export function validateCreateTemplate(body) {
  const details = [];
  const name = validateName(body.name, details);
  if (!ROUTINE_GOALS.includes(body.goal)) details.push({ field: 'goal', message: goalMessage });
  const opts = { level: null };
  optionalEnum(body.level, LEVEL, opts, details);
  const structure = validateStructure(body.structure, details);

  if (details.length > 0) fail(details);
  return { name, goal: body.goal, level: opts.level, structure };
}

/** Body de PATCH /routine-templates/:id — al menos un campo. */
export function validateUpdateTemplate(body) {
  const details = [];
  const out = {};
  if (body.name !== undefined) out.name = validateName(body.name, details);
  optionalEnum(body.goal, GOAL, out, details);
  optionalEnum(body.level, LEVEL, out, details);
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
  optionalEnum(body.goal, GOAL, out, details);
  optionalEnum(body.level, LEVEL, out, details);
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
    if (validateDays(body.days, 'days', details)) out.days = body.days;
  }
  if (details.length > 0) fail(details);
  return out;
}

/** Filtros de GET /routine-templates. */
export function validateListQuery(query) {
  const details = [];
  const out = {};
  optionalEnum(query.goal, GOAL, out, details);
  // En el filtro de listado `level` no admite null (la query siempre es texto).
  optionalEnum(query.level, [TEMPLATE_LEVELS, 'level', levelMessage], out, details);
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
