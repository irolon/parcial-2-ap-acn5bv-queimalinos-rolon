/**
 * Chat IA del alumno (tarjeta 13): tabla, columnas y límites. Spec:
 * docs/superpowers/specs/2026-11-07-student-ai-chat-design.md.
 */
import { utcToArgentina } from '../../shared/utils/dates/argentina.js';
import { argDayRange } from '../../shared/utils/dates/ranges.js';

export const CHAT_MESSAGES_TABLE = 'chat_messages';
export const CHAT_MESSAGE_COLUMNS = 'id, role, content, created_at';

/** Mensajes del alumno (role = 'user') por día de Argentina. */
export const CHAT_DAILY_LIMIT = 20;
/** Últimos mensajes del día que viajan a n8n como memoria. */
export const HISTORY_SIZE = 6;
/** Ejercicios de la biblioteca que se le ofrecen a la IA para sugerir. */
export const ALTERNATIVES_LIMIT = 30;
export const MAX_SUGGESTIONS = 3;
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_RESPONSE_LENGTH = 1500;
export const MAX_REASON_LENGTH = 200;
/**
 * RNF-04: el asistente responde en menos de 10 s o el alumno sigue sin él. Se corta a los 9 s para que el aviso
 * llegue antes de los 10 contando el viaje de vuelta (medido: con 10 s el alumno lo veía a los 10,6). El nodo de
 * KIMI del workflow corta a los 8 s, debajo de este.
 */
export const CHAT_WEBHOOK_TIMEOUT_MS = 9000;

export const CHAT_UNAVAILABLE_MESSAGE = 'El asistente no está disponible ahora. Seguí con tu entrenamiento.';
export const CHAT_INVALID_MESSAGE = 'El asistente respondió algo inválido. Probá de nuevo.';

/** Límites UTC del día de Argentina de `now`: [fromIso, toIso). */
export function chatDayBounds(now) {
  const { date } = utcToArgentina(now);
  const { fromUtc, toUtc } = argDayRange(date, date);
  return { fromIso: fromUtc.toISOString(), toIso: toUtc.toISOString() };
}

/** Consultas que le quedan hoy al alumno con `used` mensajes enviados. */
export const remainingToday = (used) => Math.max(0, CHAT_DAILY_LIMIT - used);
