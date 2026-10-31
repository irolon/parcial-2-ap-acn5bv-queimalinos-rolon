import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isRealCalendarDate } from '../../shared/utils/validators.js';

const isMissing = (v) => v === undefined || v === null || v === '';

function parseUuid(field, value, details) {
  if (!isUuid(value)) {
    details.push({ field, message: `${field} debe ser un UUID válido` });
    return undefined;
  }
  return value.toLowerCase();
}

function parseDate(field, value, details) {
  if (!isRealCalendarDate(value)) {
    details.push({ field, message: `${field} debe ser una fecha real con formato YYYY-MM-DD` });
    return undefined;
  }
  return value;
}

function throwIfAny(details) {
  if (details.length > 0) throw Errors.validation('Error de validación', details);
}

/** Params de GET /progress/exercise/:exerciseId. */
export function validateExerciseProgressParams(params) {
  const details = [];
  const exerciseId = parseUuid('exerciseId', params.exerciseId, details);
  throwIfAny(details);
  return { exerciseId };
}

/** Params de GET /progress/body/:studentId. */
export function validateBodyProgressParams(params) {
  const details = [];
  const studentId = parseUuid('studentId', params.studentId, details);
  throwIfAny(details);
  return { studentId };
}

/** Query de GET /progress/exercise/:exerciseId: student_id, from y to (from <= to). */
export function validateExerciseProgressQuery(query) {
  const details = [];
  const result = {};
  if (!isMissing(query.student_id)) result.student_id = parseUuid('student_id', query.student_id, details);
  if (!isMissing(query.from)) result.from = parseDate('from', query.from, details);
  if (!isMissing(query.to)) result.to = parseDate('to', query.to, details);
  if (details.length === 0 && result.from && result.to && result.from > result.to) {
    details.push({ field: 'from', message: 'from no puede ser posterior a to' });
  }
  throwIfAny(details);
  return result;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OVERVIEW_DAYS = 1095; // 3 años: tope del rango de /progress/overview (una fila por semana)
const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina es UTC-3 todo el año

const dayNumber = (iso) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
const todayAr = (now) => new Date(now.getTime() - AR_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Query de GET /progress/overview: las reglas de /exercise y además `from` no puede
 * quedar a más de 3 años de `to` (o de hoy en Argentina si no hay `to`), y `to` no puede ser
 * posterior a mañana en Argentina (un día de margen).
 */
export function validateProgressOverviewQuery(query, now = new Date()) {
  const result = validateExerciseProgressQuery(query);
  if (result.to && dayNumber(result.to) - dayNumber(todayAr(now)) > 1) {
    throw Errors.validation('Error de validación', [{ field: 'to', message: 'La fecha `to` no puede ser futura' }]);
  }
  if (result.from && dayNumber(result.to ?? todayAr(now)) - dayNumber(result.from) > MAX_OVERVIEW_DAYS) {
    throw Errors.validation('Error de validación', [{ field: 'from', message: 'El rango no puede superar 3 años' }]);
  }
  return result;
}
