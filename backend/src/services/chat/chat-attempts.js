import { Errors } from '../../shared/utils/errors.js';
import {
  CHAT_ATTEMPT_LIMIT,
  CHAT_ATTEMPT_WINDOW_MS,
  CHAT_ATTEMPTS_MESSAGE,
} from '../../models/chat/chat-message.model.js';

/**
 * Tope en memoria (por proceso) de las consultas que llegan a n8n por alumno: CHAT_ATTEMPT_LIMIT en una ventana
 * deslizante de 1 h, exitosas o fallidas (como el límite del asistente del PT). Se pasa → 429 RATE_LIMIT_EXCEEDED
 * con Retry-After = lo que falta para que salga de la ventana el intento que sobra. El reloj se inyecta (`now`).
 */
export function createChatAttempts() {
  const attempts = new Map(); // studentId → instantes (ms) de sus intentos, más viejos primero

  function recent(studentId, now) {
    const since = now.getTime() - CHAT_ATTEMPT_WINDOW_MS;
    const kept = (attempts.get(studentId) ?? []).filter((t) => t > since);
    if (kept.length > 0) attempts.set(studentId, kept);
    else attempts.delete(studentId);
    return kept;
  }

  return {
    assertUnderLimit(studentId, now) {
      const times = recent(studentId, now);
      if (times.length < CHAT_ATTEMPT_LIMIT) return;
      const freeAt = times[times.length - CHAT_ATTEMPT_LIMIT] + CHAT_ATTEMPT_WINDOW_MS;
      throw Errors.rateLimitExceeded(Math.max(1, Math.ceil((freeAt - now.getTime()) / 1000)), CHAT_ATTEMPTS_MESSAGE);
    },

    /** Anota un intento (justo antes de preguntarle a n8n). */
    record(studentId, now) {
      attempts.set(studentId, [...recent(studentId, now), now.getTime()]);
    },

    /** Vacía todo (tests). */
    clear() {
      attempts.clear();
    },
  };
}

/** El tope del proceso, compartido por todas las requests. */
export const chatAttempts = createChatAttempts();
