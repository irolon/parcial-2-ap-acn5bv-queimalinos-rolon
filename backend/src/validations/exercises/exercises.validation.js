import { Errors } from '../../shared/utils/errors.js';
import { MUSCLE_GROUPS, EQUIPMENT } from '../../models/exercises/exercise.model.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isString = (v) => typeof v === 'string';
const trimmed = (v) => (isString(v) ? v.trim() : v);

const VIDEO_URL_MESSAGE =
  'El video debe ser un link que empiece con http:// o https:// (máximo 500 caracteres)';

function isValidVideoUrl(value) {
  if (value.length > 500 || !/^https?:\/\//i.test(value)) return false;
  try {
    return new URL(value).hostname !== '';
  } catch {
    return false;
  }
}

/** Reglas extra por campo opcional: devuelven el mensaje de error o null. */
const OPTIONAL_RULES = {
  equipment: (v) => (EQUIPMENT.includes(v) ? null : `Debe ser uno de: ${EQUIPMENT.join(', ')}`),
  video_url: (v) => (isValidVideoUrl(v) ? null : VIDEO_URL_MESSAGE),
  description: (v) => (v.length <= 1000 ? null : 'La descripción puede tener hasta 1000 caracteres'),
};

/**
 * Valida un campo opcional (equipment, description, video_url). Devuelve
 * { value } (null si viene null o vacío) o { error } con el mensaje.
 */
function parseOptional(field, raw) {
  if (raw === null) return { value: null };
  if (!isString(raw)) return { error: `${field} debe ser texto` };
  const value = raw.trim();
  if (value === '') return { value: null };
  const error = OPTIONAL_RULES[field](value);
  return error ? { error } : { value };
}

/** Aplica parseOptional a los tres campos presentes; acumula errores en details. */
function collectOptionals(body, details) {
  const out = {};
  Object.keys(OPTIONAL_RULES).forEach((field) => {
    if (body[field] === undefined) return;
    const { value, error } = parseOptional(field, body[field]);
    if (error) details.push({ field, message: error });
    else out[field] = value;
  });
  return out;
}

/** Filtros de GET /exercises (query string). */
export function validateListQuery(query) {
  const details = [];
  const out = {};

  if (query.muscle_group !== undefined) {
    if (!MUSCLE_GROUPS.includes(query.muscle_group)) {
      details.push({ field: 'muscle_group', message: `Debe ser uno de: ${MUSCLE_GROUPS.join(', ')}` });
    } else {
      out.muscleGroup = query.muscle_group;
    }
  }
  if (isString(query.equipment) && query.equipment.trim() !== '') out.equipment = query.equipment.trim();
  if (isString(query.search) && query.search.trim() !== '') out.search = query.search.trim();

  // include_global: por defecto true; 'false' lo desactiva.
  out.includeGlobal = query.include_global !== 'false';

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}

/** Body de POST /exercises. */
export function validateCreateExercise(body) {
  const details = [];
  const name = trimmed(body.name);

  if (!isString(name) || name.length < 2 || name.length > 120) {
    details.push({ field: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' });
  }
  if (!MUSCLE_GROUPS.includes(body.muscle_group)) {
    details.push({ field: 'muscle_group', message: `Debe ser uno de: ${MUSCLE_GROUPS.join(', ')}` });
  }
  const optionals = collectOptionals(body, details);

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return {
    name,
    muscle_group: body.muscle_group,
    equipment: null,
    description: null,
    video_url: null,
    ...optionals,
  };
}

/** Body de PATCH /exercises/:id — al menos un campo, solo los permitidos. */
export function validateUpdateExercise(body) {
  const details = [];
  const out = {};

  if (body.name !== undefined) {
    const name = trimmed(body.name);
    if (!isString(name) || name.length < 2 || name.length > 120) {
      details.push({ field: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' });
    } else out.name = name;
  }
  if (body.muscle_group !== undefined) {
    if (!MUSCLE_GROUPS.includes(body.muscle_group)) {
      details.push({ field: 'muscle_group', message: `Debe ser uno de: ${MUSCLE_GROUPS.join(', ')}` });
    } else out.muscle_group = body.muscle_group;
  }
  Object.assign(out, collectOptionals(body, details));

  if (Object.keys(out).length === 0) {
    details.push({ field: 'body', message: 'Enviá al menos un campo para actualizar' });
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}

/** Valida el :id de la ruta (UUID). */
export function validateIdParam(params) {
  if (!isString(params.id) || !UUID_RE.test(params.id)) {
    throw Errors.validation('Error de validación', [{ field: 'id', message: 'id inválido' }]);
  }
  return { id: params.id };
}
