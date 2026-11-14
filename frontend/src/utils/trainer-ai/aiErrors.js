import { FIELD_MESSAGES } from './aiForm';

const UNAVAILABLE = 'El asistente no está disponible ahora.';
const INVALID = 'La IA devolvió una propuesta que no sirve. Probá de nuevo.';

// Campo del body → campo del formulario.
const FORM_FIELD = {
  goal: 'goal',
  level: 'level',
  frequency_per_week: 'frequency',
  session_duration_min: 'duration',
  injuries: 'injuries',
  preferences: 'preferences',
};

/** El alumno elegido (o el de `?alumno=`) no es un activo del entrenador. */
export const STUDENT_NOT_FOUND = 'Ese alumno no está activo o no existe';
/** Segundos de espera de un 429 que no trajo `Retry-After`: el timeout del backend para una generación (38 s). */
const DEFAULT_RETRY_AFTER = 38;

const NOT_FOUND = {
  STUDENT_NOT_FOUND: { studentId: STUDENT_NOT_FOUND },
  TEMPLATE_NOT_FOUND: { baseTemplateId: 'Esa plantilla ya no existe' },
};

function validationFields(details) {
  const fields = {};
  for (const { field } of Array.isArray(details) ? details : []) {
    const name = FORM_FIELD[field];
    if (name) fields[name] = FIELD_MESSAGES[name];
  }
  return Object.keys(fields).length > 0 ? { kind: 'fields', fields } : { kind: 'fields', fields: {}, form: 'Revisá los datos del formulario' };
}

/**
 * Qué mostrar ante un error de generar:
 * - `fields`: vuelve al formulario con errores en su campo (400, y 404 del alumno o la plantilla);
 * - `rate`: el mensaje del backend y la cuenta atrás de `Retry-After` (38 s si no vino);
 * - `invalid` (502) y `unavailable` (503, sin red o cualquier otro): mensaje fijo con salidas.
 */
export function aiErrorOf(error) {
  const code = error?.code;
  if (code === 'VALIDATION_ERROR') return validationFields(error.details);
  if (NOT_FOUND[code]) return { kind: 'fields', fields: NOT_FOUND[code] };
  if (code === 'RATE_LIMIT_EXCEEDED') return { kind: 'rate', message: error.message, retryAfter: error.retryAfter ?? DEFAULT_RETRY_AFTER };
  if (code === 'AI_INVALID_RESPONSE') return { kind: 'invalid', message: INVALID };
  return { kind: 'unavailable', message: UNAVAILABLE };
}
