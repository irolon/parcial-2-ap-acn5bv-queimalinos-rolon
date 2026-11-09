import { ApiError, request } from '@/api/shared/client';

/**
 * Tope del lado del cliente: el backend corta a n8n a los 16 s (n8n a los 15 s) y contesta 503, así que esto solo
 * salta si ese 503 tampoco llega (servidor colgado). Tiene que quedar por encima del corte del backend: si no, una
 * respuesta tardía se guarda y cuenta para el límite sin que el alumno la vea. Se trata igual que el 503: el
 * asistente no está disponible. Sin `message`: el texto lo pone `chatProblem` (el mismo que el del 503 del servidor).
 */
export const CHAT_TIMEOUT_MS = 18_000;

const UNAVAILABLE = { status: 503, code: 'AI_UNAVAILABLE', message: '' };

/** GET /chat/today (alumno) → `{ messages: [{ id, role, content, created_at }], remaining_today }`. */
export async function getChatToday() {
  const res = await request('/chat/today');
  return res.data;
}

/**
 * POST /chat (alumno) → `{ message_id, response, suggestions: [{ exercise_id, name, reason }], remaining_today }`.
 * `sessionId` y `exerciseId` son opcionales: sin ellos solo viaja el mensaje. Pasado `CHAT_TIMEOUT_MS` se corta el
 * pedido y tira el mismo `ApiError` que un 503 `AI_UNAVAILABLE`.
 */
export async function sendChat({ message, sessionId, exerciseId }) {
  const body = { message };
  if (sessionId) body.session_id = sessionId;
  if (exerciseId) body.current_exercise_id = exerciseId;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    const res = await request('/chat', { method: 'POST', body, signal: controller.signal });
    return res.data;
  } catch (err) {
    if (err?.name === 'AbortError') throw new ApiError(UNAVAILABLE);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
