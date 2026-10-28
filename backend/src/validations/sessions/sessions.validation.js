import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIsoDateTime } from '../../shared/utils/validators.js';

const MAX_NOTES = 1000;
const DATETIME_MSG = 'debe ser fecha y hora ISO 8601 con zona (ej. 2026-10-17T09:30:00-03:00)';

export const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};
export const isMissing = (v) => v === undefined || v === null;
export const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Cada parser anota el error en `details` y devuelve el valor (o undefined). */
function parseRpe(value, details) {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    details.push({ field: 'rpe', message: 'rpe debe ser un entero entre 1 y 10' });
    return undefined;
  }
  return value;
}

function parseNotes(value, details) {
  if (typeof value !== 'string' || value.length > MAX_NOTES) {
    details.push({ field: 'notes', message: `notes debe ser texto de hasta ${MAX_NOTES} caracteres` });
    return undefined;
  }
  return value;
}

export function parseDateTime(field, value, details) {
  if (!isIsoDateTime(value)) {
    details.push({ field, message: `${field} ${DATETIME_MSG}` });
    return undefined;
  }
  return value;
}

export function parseUuid(field, value, details) {
  if (!isUuid(value)) {
    details.push({ field, message: `${field} debe ser un UUID` });
    return undefined;
  }
  return value.toLowerCase();
}

/**
 * Valida el body de POST /sessions. `id` lo genera el cliente (offline-first).
 * `student_id` y `has_modifications` nunca se aceptan del cliente.
 */
export function validateCreateSession(body) {
  const details = [];
  const src = isObject(body) ? body : {};
  const out = { id: parseUuid('id', src.id, details), routine_id: null, rpe: null, notes: null, finished_at: null };

  if (!isMissing(src.routine_id)) out.routine_id = parseUuid('routine_id', src.routine_id, details);
  out.started_at = parseDateTime('started_at', src.started_at, details);
  if (!isMissing(src.finished_at)) out.finished_at = parseDateTime('finished_at', src.finished_at, details);
  if (!isMissing(src.rpe)) out.rpe = parseRpe(src.rpe, details);
  if (!isMissing(src.notes)) out.notes = parseNotes(src.notes, details);

  if (out.started_at && out.finished_at && Date.parse(out.finished_at) < Date.parse(out.started_at)) {
    details.push({ field: 'finished_at', message: 'finished_at no puede ser anterior a started_at' });
  }
  if (details.length > 0) fail(details);
  return {
    id: out.id,
    routine_id: out.routine_id,
    started_at: out.started_at,
    finished_at: out.finished_at,
    rpe: out.rpe,
    notes: out.notes,
  };
}

/** Valida el body de PATCH /sessions/:id: al menos uno de finished_at, rpe, notes. */
export function validateUpdateSession(body) {
  const details = [];
  const src = isObject(body) ? body : {};
  const out = {};

  if (src.finished_at !== undefined) out.finished_at = parseDateTime('finished_at', src.finished_at, details);
  if (src.rpe !== undefined) out.rpe = parseRpe(src.rpe, details);
  if (src.notes !== undefined) out.notes = parseNotes(src.notes, details);

  if (details.length > 0) fail(details);
  if (Object.keys(out).length === 0) {
    fail([{ field: 'body', message: 'Enviá al menos uno de: finished_at, rpe, notes' }]);
  }
  return out;
}

/** Valida :id de las rutas de sesión (en minúscula). */
export function validateSessionIdParam(params) {
  const details = [];
  const id = parseUuid('id', params?.id, details);
  if (details.length > 0) fail([{ field: 'id', message: 'id inválido' }]);
  return { id };
}
