import { Errors } from '../../shared/utils/errors.js';
import { isUuid } from '../../shared/utils/validators.js';
import { MAX_MESSAGE_LENGTH } from '../../models/chat/chat-message.model.js';

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
