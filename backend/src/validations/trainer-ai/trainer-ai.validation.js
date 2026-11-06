import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIntBetween } from '../../shared/utils/validators.js';
import { ROUTINE_GOALS } from '../../models/routines/routine.model.js';
import { TEMPLATE_LEVELS } from '../../models/routine-templates/routine-template.model.js';
import { EQUIPMENT } from '../../models/exercises/exercise.model.js';
import {
  DEFAULT_SESSION_MIN,
  MAX_TEXT_LENGTH,
  MAX_TEMPLATE_NAME,
} from '../../models/trainer-ai/ai-generation.model.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

/** `body[field]` opcional: undefined si no vino; si vino tiene que ser uno de `allowed`. */
function optionalEnum(body, field, allowed, details, out) {
  if (body[field] === undefined || body[field] === null) return;
  if (!allowed.includes(body[field])) {
    details.push({ field, message: `${field} debe ser uno de: ${allowed.join(', ')}` });
  } else out[field] = body[field];
}

/** Texto opcional de hasta 500 caracteres; vacío o null cuenta como no enviado. */
function optionalText(body, field, details, out) {
  const value = body[field];
  if (value === undefined || value === null) return;
  if (typeof value !== 'string' || value.trim().length > MAX_TEXT_LENGTH) {
    details.push({ field, message: `${field} debe ser un texto de hasta ${MAX_TEXT_LENGTH} caracteres` });
  } else if (value.trim()) out[field] = value.trim();
}

function optionalUuid(body, field, details, out) {
  if (body[field] === undefined || body[field] === null) return;
  if (!isUuid(body[field])) details.push({ field, message: `${field} inválido` });
  else out[field] = body[field];
}

function validateEquipment(value, details, out) {
  if (value === undefined || value === null) return;
  const valid =
    Array.isArray(value) && value.every((e) => EQUIPMENT.includes(e)) && new Set(value).size === value.length;
  if (!valid) {
    details.push({
      field: 'available_equipment',
      message: `available_equipment debe ser una lista sin repetidos de: ${EQUIPMENT.join(', ')}`,
    });
  } else out.available_equipment = value;
}

/**
 * Body de POST /trainer-ai/generate-routine. goal y level son obligatorios salvo que venga
 * student_id (los completa el alumno en el service). Los campos de más se descartan.
 */
export function validateGenerateRoutine(body) {
  const details = [];
  const out = {};
  optionalUuid(body, 'student_id', details, out);
  for (const [field, allowed] of [['goal', ROUTINE_GOALS], ['level', TEMPLATE_LEVELS]]) {
    if (body[field] === undefined && body.student_id === undefined) {
      details.push({ field, message: `${field} es obligatorio (o mandá student_id)` });
    } else optionalEnum(body, field, allowed, details, out);
  }
  if (!isIntBetween(body.frequency_per_week, 1, 7)) {
    details.push({ field: 'frequency_per_week', message: 'frequency_per_week debe ser un entero de 1 a 7' });
  } else out.frequency_per_week = body.frequency_per_week;
  if (body.session_duration_min === undefined) out.session_duration_min = DEFAULT_SESSION_MIN;
  else if (!isIntBetween(body.session_duration_min, 20, 180)) {
    details.push({ field: 'session_duration_min', message: 'session_duration_min debe ser un entero de 20 a 180' });
  } else out.session_duration_min = body.session_duration_min;
  validateEquipment(body.available_equipment, details, out);
  optionalText(body, 'injuries', details, out);
  optionalText(body, 'preferences', details, out);
  optionalUuid(body, 'base_template_id', details, out);

  if (details.length > 0) fail(details);
  return out;
}

/** Body de POST /trainer-ai/save-as-template. */
export function validateSaveAsTemplate(body) {
  const details = [];
  if (!isUuid(body.generation_id)) details.push({ field: 'generation_id', message: 'generation_id inválido' });
  const name = typeof body.template_name === 'string' ? body.template_name.trim() : '';
  if (name.length < 1 || name.length > MAX_TEMPLATE_NAME) {
    details.push({
      field: 'template_name',
      message: `template_name debe tener entre 1 y ${MAX_TEMPLATE_NAME} caracteres`,
    });
  }
  if (details.length > 0) fail(details);
  return { generation_id: body.generation_id, template_name: name };
}
