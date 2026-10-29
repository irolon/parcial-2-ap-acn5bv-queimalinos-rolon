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
