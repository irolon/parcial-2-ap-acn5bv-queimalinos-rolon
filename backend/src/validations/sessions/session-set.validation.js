import { fail, isMissing, isObject, parseDateTime, parseUuid } from './sessions.validation.js';

const MAX_SETS_PER_REQUEST = 100;
const MAX_REST_SECONDS = 3600;

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
    // Descanso real después de esta serie (lo mide el celular); null = sin dato.
    rest_seconds: isMissing(raw.rest_seconds) ? null : intField('rest_seconds', 0, MAX_REST_SECONDS),
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
