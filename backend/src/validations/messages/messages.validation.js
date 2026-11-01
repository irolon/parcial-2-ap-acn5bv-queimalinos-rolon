import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIsoDateTime } from '../../shared/utils/validators.js';
import {
  MAX_BODY,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_BROADCAST,
} from '../../models/messages/message.model.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

// Largo en caracteres reales (como char_length de Postgres), no en unidades UTF-16.
const length = (s) => [...s].length;

export function validateStudentIdParam(params) {
  if (!isUuid(params.studentId)) fail([{ field: 'studentId', message: 'studentId inválido' }]);
  return { studentId: params.studentId.toLowerCase() };
}

/** Query del historial: before ISO con zona (opcional), limit 1–100 (50). */
export function validateHistoryQuery(query) {
  const details = [];
  const out = { before: null, limit: DEFAULT_LIMIT };
  if (query.before !== undefined) {
    if (!isIsoDateTime(query.before)) {
      details.push({ field: 'before', message: 'before debe ser una fecha ISO 8601 con zona' });
    } else out.before = query.before;
  }
  if (query.limit !== undefined) {
    const n = typeof query.limit === 'string' && /^\d+$/.test(query.limit) ? Number(query.limit) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      details.push({ field: 'limit', message: `limit debe ser un entero entre 1 y ${MAX_LIMIT}` });
    } else out.limit = n;
  }
  if (details.length > 0) fail(details);
  return out;
}

/** Texto del envío: opcional. Se recorta; vacío queda en null (la foto puede ir sola). */
export function validateSendBody(body) {
  const raw = body?.body;
  if (raw === undefined || raw === null) return { body: null };
  if (typeof raw !== 'string') fail([{ field: 'body', message: 'body debe ser un texto' }]);
  const text = raw.trim();
  if (length(text) > MAX_BODY) {
    fail([{ field: 'body', message: `body no puede superar los ${MAX_BODY} caracteres` }]);
  }
  return { body: text === '' ? null : text };
}

/** Envío masivo: 1–200 uuid sin repetidos y un texto obligatorio de 1–2000 caracteres. */
export function validateBroadcast(body) {
  const details = [];
  const ids = body?.student_ids;
  let studentIds = [];
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_BROADCAST) {
    details.push({
      field: 'student_ids',
      message: `student_ids debe ser una lista de 1 a ${MAX_BROADCAST} ids`,
    });
  } else if (!ids.every(isUuid)) {
    details.push({ field: 'student_ids', message: 'student_ids debe tener solo uuid válidos' });
  } else {
    studentIds = ids.map((id) => id.toLowerCase());
    if (new Set(studentIds).size !== studentIds.length) {
      details.push({ field: 'student_ids', message: 'student_ids no puede tener ids repetidos' });
    }
  }
  const text = typeof body?.body === 'string' ? body.body.trim() : '';
  if (text === '' || length(text) > MAX_BODY) {
    details.push({ field: 'body', message: `body es obligatorio y de hasta ${MAX_BODY} caracteres` });
  }
  if (details.length > 0) fail(details);
  return { studentIds, body: text };
}
