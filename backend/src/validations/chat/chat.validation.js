import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isRealCalendarDate } from '../../shared/utils/validators.js';
import { MAX_MESSAGE_LENGTH, HISTORY_DAYS_DEFAULT, HISTORY_DAYS_MAX } from '../../models/chat/chat-message.model.js';

/**
 * Body de POST /chat: `message` (1-500, recortado) y, opcionales, `session_id` y
 * `current_exercise_id` (null = no enviado). Los campos de más se descartan, incluido el
 * `context.gym_equipment` del contrato viejo: el equipamiento sale de la ficha del alumno.
 */
export function validateChatBody(body) {
  const details = [];
  const out = {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 1 || message.length > MAX_MESSAGE_LENGTH) {
    details.push({ field: 'message', message: `message debe tener entre 1 y ${MAX_MESSAGE_LENGTH} caracteres` });
  } else out.message = message;
  for (const field of ['session_id', 'current_exercise_id']) {
    if (body[field] === undefined || body[field] === null) continue;
    if (!isUuid(body[field])) details.push({ field, message: `${field} inválido` });
    else out[field] = body[field];
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}

/**
 * Query de GET /chat/history: `before` (YYYY-MM-DD real, opcional: el servicio usa hoy) y `days` (entero de 1 a 14,
 * por defecto 7). Lo demás se descarta.
 */
export function validateHistoryQuery(query) {
  const details = [];
  const out = { days: HISTORY_DAYS_DEFAULT };
  if (query.before !== undefined) {
    if (isRealCalendarDate(query.before)) out.before = query.before;
    else details.push({ field: 'before', message: 'before debe ser una fecha YYYY-MM-DD válida' });
  }
  if (query.days !== undefined) {
    const days = /^\d+$/.test(String(query.days)) ? Number(query.days) : NaN;
    if (days >= 1 && days <= HISTORY_DAYS_MAX) out.days = days;
    else details.push({ field: 'days', message: `days debe ser un entero de 1 a ${HISTORY_DAYS_MAX}` });
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}
