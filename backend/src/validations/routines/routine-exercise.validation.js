const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isPosInt = (v) => Number.isInteger(v) && v > 0;
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;
const isNonNegNum = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const maxLen = (max) => (v) => typeof v === 'string' && v.trim().length <= max;

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

// Campos requeridos (no aceptan null) y opcionales (null = sin valor).
const REQUIRED = {
  sets: [isPosInt, 'sets debe ser un entero positivo'],
  reps: [isPosInt, 'reps debe ser un entero positivo'],
};
const OPTIONAL = {
  rest_seconds: [isNonNegInt, 'rest_seconds debe ser un entero mayor o igual a 0'],
  suggested_kg: [isNonNegNum, 'suggested_kg debe ser un número mayor o igual a 0'],
  tempo: [maxLen(20), 'tempo debe tener como máximo 20 caracteres'],
  notes: [maxLen(500), 'notes debe tener como máximo 500 caracteres'],
};
const clean = (v) => (typeof v === 'string' ? v.trim() || null : v);

/**
 * Valida los campos editables de un ejercicio de rutina/plantilla. Un valor
 * inválido es error (nunca se convierte en null). Con `partial` todo es
 * opcional y `null` borra los opcionales; sin `partial`, sets/reps son
 * obligatorios y los opcionales ausentes quedan en null.
 */
export function validateExerciseFields(body, details, { partial = false, prefix = '' } = {}) {
  const out = {};
  const path = (key) => (prefix ? `${prefix}.${key}` : key);

  for (const [key, [ok, message]] of Object.entries(REQUIRED)) {
    if (partial && body[key] === undefined) continue;
    if (!ok(body[key])) details.push({ field: path(key), message });
    else out[key] = body[key];
  }
  for (const [key, [ok, message]] of Object.entries(OPTIONAL)) {
    const value = body[key];
    if (value === undefined && partial) continue;
    if (value === undefined || value === null) out[key] = null;
    else if (!ok(value)) details.push({ field: path(key), message });
    else out[key] = clean(value);
  }
  return out;
}

/** Valida un item de exercises[] (rutina o plantilla) y devuelve la versión saneada. */
export function validateExerciseItem(item, prefix, details) {
  if (!item || typeof item !== 'object') {
    details.push({ field: prefix, message: 'Debe ser un objeto' });
    return null;
  }
  if (!isUuid(item.exercise_id)) {
    details.push({ field: `${prefix}.exercise_id`, message: 'exercise_id inválido' });
  }
  if (item.order !== undefined && !isNonNegInt(item.order)) {
    details.push({ field: `${prefix}.order`, message: 'order debe ser un entero mayor o igual a 0' });
  }
  const fields = validateExerciseFields(item, details, { prefix });
  return { exercise_id: item.exercise_id, ...fields, order: item.order };
}
