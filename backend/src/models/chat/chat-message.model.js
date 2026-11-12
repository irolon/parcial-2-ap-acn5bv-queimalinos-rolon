/**
 * Chat IA del alumno (tarjeta 13): tabla, columnas y límites. Spec:
 * docs/superpowers/specs/2026-11-07-student-ai-chat-design.md.
 */
import { utcToArgentina } from '../../shared/utils/dates/argentina.js';
import { argDayRange } from '../../shared/utils/dates/ranges.js';

export const CHAT_MESSAGES_TABLE = 'chat_messages';
/**
 * Lo que se lee de cada mensaje (GX5): el ejercicio sobre el que se preguntó y la rutina de la sesión, embebidos, y
 * las sugerencias de la respuesta. `toChatMessage` lo aplana. La inserción devuelve solo `CHAT_SAVED_COLUMNS`.
 */
export const CHAT_MESSAGE_COLUMNS =
  'id, role, content, created_at, exercise_id, suggestions, exercise:exercises (id, name), session:sessions (routine:routines (name))';
export const CHAT_SAVED_COLUMNS = 'id, role, content, created_at';

/** Mensajes del alumno (role = 'user') por día de Argentina. */
export const CHAT_DAILY_LIMIT = 20;
/**
 * Intentos que llegan a n8n por alumno en una ventana deslizante de 1 h, salgan bien o mal. Las fallas no cuentan
 * para el límite del día, pero cada una es una llamada a KIMI: esto cubre un cliente que reintenta en bucle.
 */
export const CHAT_ATTEMPT_LIMIT = 30;
export const CHAT_ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
export const CHAT_ATTEMPTS_MESSAGE = 'Hiciste muchas consultas seguidas. Probá de nuevo más tarde.';
/** GET /chat/history: días por página (por defecto y tope). */
export const HISTORY_DAYS_DEFAULT = 7;
export const HISTORY_DAYS_MAX = 14;
/** Últimos mensajes del día que viajan a n8n como memoria. */
export const HISTORY_SIZE = 6;
/** Ejercicios de la biblioteca que se le ofrecen a la IA para sugerir. */
export const ALTERNATIVES_LIMIT = 30;
export const MAX_SUGGESTIONS = 3;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_RESPONSE_LENGTH = 1500;
export const MAX_REASON_LENGTH = 200;
/**
 * RNF-04: el 95 % de las respuestas del asistente llegan en menos de 10 s, y si se pasa del corte el alumno sigue
 * sin él. Con KIMI (kimi-k3.1-pro) la mayoría llega en 2 a 7 s, pero Moonshot a veces tarda más de 8 s: con el
 * corte en 9 s se perdían respuestas que llegaban un poco después (09/11). Se corta a los 16 s; el nodo del modelo
 * en el workflow corta a los 15 s, debajo de este. El celular espera hasta 30 s.
 */
export const CHAT_WEBHOOK_TIMEOUT_MS = 16000;

export const CHAT_UNAVAILABLE_MESSAGE = 'El asistente no está disponible ahora. Seguí con tu entrenamiento.';
export const CHAT_INVALID_MESSAGE = 'El asistente respondió algo que no entendimos. Probá de nuevo.';

/** Límites UTC del día de Argentina de `now`: [fromIso, toIso). */
export function chatDayBounds(now) {
  const { date } = utcToArgentina(now);
  const { fromUtc, toUtc } = argDayRange(date, date);
  return { fromIso: fromUtc.toISOString(), toIso: toUtc.toISOString() };
}

/** Consultas que le quedan hoy al alumno con `used` mensajes enviados. */
export const remainingToday = (used) => Math.max(0, CHAT_DAILY_LIMIT - used);

/** Un mensaje como lo devuelven GET /chat/today y GET /chat/history: con su contexto (o null) y sus sugerencias. */
export const toChatMessage = (row) => ({
  id: row.id,
  role: row.role,
  content: row.content,
  created_at: row.created_at,
  exercise: row.exercise ? { id: row.exercise.id, name: row.exercise.name } : null,
  routine_name: row.session?.routine?.name ?? null,
  suggestions: Array.isArray(row.suggestions) ? row.suggestions : [],
});
