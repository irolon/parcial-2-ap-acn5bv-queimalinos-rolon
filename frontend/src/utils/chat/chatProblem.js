import { isNetworkError } from '@/api/shared/client';

export const LIMIT_TEXT = 'Llegaste al límite de consultas de hoy. Mañana podés seguir.';
export const OFFLINE_TEXT = 'El asistente necesita conexión';
const UNAVAILABLE_TEXT = 'El asistente no está disponible ahora. Seguí con tu entrenamiento.';
const INVALID_TEXT = 'El asistente respondió algo que no entendimos. Probá de nuevo.';
const SESSION_CODES = ['SESSION_FINISHED', 'SESSION_NOT_FOUND'];

/**
 * Qué decirle al alumno cuando falla una consulta al asistente: `{ kind, text, retry }`, o null sin error.
 * - `limit` (429): el mensaje del límite; no se reintenta hasta mañana.
 * - `offline` (sin red): "El asistente necesita conexión"; se puede reintentar.
 * - `invalid` (502) y `unavailable` (503, el tope de tiempo y cualquier otro error): con Reintentar.
 * - `session` (400 / 404 por la sesión): lo que dice el servidor; reintentar daría lo mismo.
 */
export function chatProblem(error) {
  if (!error) return null;
  if (error.code === 'CHAT_LIMIT_REACHED') return { kind: 'limit', text: LIMIT_TEXT, retry: false };
  if (isNetworkError(error)) return { kind: 'offline', text: OFFLINE_TEXT, retry: true };
  if (error.code === 'AI_INVALID_RESPONSE') return { kind: 'invalid', text: INVALID_TEXT, retry: true };
  if (SESSION_CODES.includes(error.code)) return { kind: 'session', text: error.message, retry: false };
  return { kind: 'unavailable', text: UNAVAILABLE_TEXT, retry: true };
}

/** "Te quedan 17 consultas hoy" (en singular solo con 1). */
export const remainingText = (count) =>
  (count === 1 ? 'Te queda 1 consulta hoy' : `Te quedan ${count} consultas hoy`);
