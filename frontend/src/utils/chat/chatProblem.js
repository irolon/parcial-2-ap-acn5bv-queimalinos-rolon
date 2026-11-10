import { isNetworkError } from '@/api/shared/client';

// Textos locales: los avisos sin respuesta del servidor (sin conexión, contador en 0) y el respaldo de los errores
// del backend cuando no traen mensaje. Con mensaje, manda el del servidor (una sola copia de cada texto).
export const LIMIT_TEXT = 'Llegaste al límite de consultas de hoy. Mañana podés seguir.';
export const OFFLINE_TEXT = 'El asistente necesita conexión';
const UNAVAILABLE_TEXT = 'El asistente no está disponible ahora. Seguí con tu entrenamiento.';
const INVALID_TEXT = 'El asistente respondió algo que no entendimos. Probá de nuevo.';
const BUSY_TEXT = 'Esperá la respuesta anterior.';
const TOO_MANY_TEXT = 'Hiciste muchas consultas seguidas. Probá de nuevo más tarde.';
const SESSION_CODES = ['SESSION_FINISHED', 'SESSION_NOT_FOUND'];

// Los errores del backend del chat (502, 503 y los tres 429) con su aviso; un 502/503 sin código (un proxy) no está.
const ASSISTANT_ERRORS = {
  CHAT_LIMIT_REACHED: { kind: 'limit', text: LIMIT_TEXT, retry: false },
  CHAT_IN_PROGRESS: { kind: 'busy', text: BUSY_TEXT, retry: true },
  RATE_LIMIT_EXCEEDED: { kind: 'tooMany', text: TOO_MANY_TEXT, retry: false },
  AI_INVALID_RESPONSE: { kind: 'invalid', text: INVALID_TEXT, retry: true },
  AI_UNAVAILABLE: { kind: 'unavailable', text: UNAVAILABLE_TEXT, retry: true },
};

/**
 * Qué decirle al alumno cuando falla una consulta al asistente: `{ kind, text, retry }`, o null sin error.
 * - `limit` (429 `CHAT_LIMIT_REACHED`): no se reintenta hasta mañana.
 * - `busy` (429 `CHAT_IN_PROGRESS`): otra consulta del alumno (otra pestaña o el celular) sigue en curso.
 * - `tooMany` (429 `RATE_LIMIT_EXCEEDED`): pasó el tope de intentos por hora; reintentar ya daría lo mismo.
 * - `offline` (sin red): "El asistente necesita conexión"; el panel ofrece Reintentar solo si el navegador está en línea.
 * - `invalid` (502) y `unavailable` (503, el tope de tiempo y cualquier otro error): con Reintentar.
 * - `session` (400 / 404 por la sesión): lo que dice el servidor; reintentar daría lo mismo.
 * Para los del backend el texto es el `message` del servidor si vino; si no, el local.
 */
export function chatProblem(error) {
  if (!error) return null;
  const known = ASSISTANT_ERRORS[error.code];
  if (known) return { ...known, text: error.message || known.text };
  if (isNetworkError(error)) return { kind: 'offline', text: OFFLINE_TEXT, retry: true };
  if (SESSION_CODES.includes(error.code)) return { kind: 'session', text: error.message, retry: false };
  return { ...ASSISTANT_ERRORS.AI_UNAVAILABLE };
}

/** "Te quedan 17 consultas hoy" (en singular solo con 1). */
export const remainingText = (count) =>
  (count === 1 ? 'Te queda 1 consulta hoy' : `Te quedan ${count} consultas hoy`);
