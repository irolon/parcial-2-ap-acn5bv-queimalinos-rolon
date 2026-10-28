import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIsoDateTime } from '../../shared/utils/validators.js';

const MAX_NOTES = 1000;
const MAX_SETS_PER_REQUEST = 100;
const DATETIME_MSG = 'debe ser fecha y hora ISO 8601 con zona (ej. 2026-10-17T09:30:00-03:00)';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};
const isMissing = (v) => v === undefined || v === null;
const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

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

function parseDateTime(field, value, details) {
  if (!isIsoDateTime(value)) {
    details.push({ field, message: `${field} ${DATETIME_MSG}` });
    return undefined;
  }
  return value;
}

function parseUuid(field, value, details) {
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

/** Valida el envelope de POST /sessions/:id/sets: `sets` es un array de 1 a 100. */
export function validateSetsEnvelope(body) {
  const sets = isObject(body) ? body.sets : undefined;
  if (!Array.isArray(sets) || sets.length < 1 || sets.length > MAX_SETS_PER_REQUEST) {
    fail([{ field: 'sets', message: `sets debe ser un arreglo de 1 a ${MAX_SETS_PER_REQUEST} series` }]);
  }
  return { sets };
}

/**
 * Valida una serie sin tirar: el servicio decide qué hacer con las inválidas.
 * No chequea fechas futuras (las series se sincronizan offline, el reloj puede variar).
 */
export function parseSet(raw) {
  if (!isObject(raw)) return { ok: false, details: [{ field: 'set', message: 'la serie debe ser un objeto' }] };
  const details = [];
  const intField = (field, min, max) => {
    if (!Number.isInteger(raw[field]) || raw[field] < min || raw[field] > max) {
      details.push({ field, message: `${field} debe ser un entero entre ${min} y ${max}` });
    }
    return raw[field];
  };

  const value = {
    id: parseUuid('id', raw.id, details),
    exercise_id: parseUuid('exercise_id', raw.exercise_id, details),
    original_exercise_id: isMissing(raw.original_exercise_id)
      ? null : parseUuid('original_exercise_id', raw.original_exercise_id, details),
    routine_exercise_id: isMissing(raw.routine_exercise_id)
      ? null : parseUuid('routine_exercise_id', raw.routine_exercise_id, details),
    set_number: intField('set_number', 1, 100),
    actual_reps: intField('actual_reps', 0, 1000),
    actual_kg: null,
    completed: true,
    executed_at: parseDateTime('executed_at', raw.executed_at, details),
  };
  if (!isMissing(raw.actual_kg)) {
    if (typeof raw.actual_kg !== 'number' || !Number.isFinite(raw.actual_kg) || raw.actual_kg < 0
      || raw.actual_kg > 1000) {
      details.push({ field: 'actual_kg', message: 'actual_kg debe ser un número entre 0 y 1000' });
    } else {
      value.actual_kg = raw.actual_kg;
    }
  }
  if (!isMissing(raw.completed)) {
    if (typeof raw.completed !== 'boolean') {
      details.push({ field: 'completed', message: 'completed debe ser verdadero o falso' });
    } else {
      value.completed = raw.completed;
    }
  }
  return details.length > 0 ? { ok: false, details } : { ok: true, value };
}
