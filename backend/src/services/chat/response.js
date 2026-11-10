import { Errors } from '../../shared/utils/errors.js';
import {
  MAX_SUGGESTIONS,
  MAX_RESPONSE_LENGTH,
  MAX_REASON_LENGTH,
  CHAT_INVALID_MESSAGE,
} from '../../models/chat/chat-message.model.js';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const textBetween = (v, min, max) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null;

/**
 * Sugerencias válidas, en orden y hasta 3: solo ejercicios de `alternatives` (la IA no los
 * inventa), con `reason` de 1 a 200 y sin repetir. Las que no cumplen se descartan sin
 * rechazar la respuesta; el nombre sale de la biblioteca, no de la IA.
 */
function cleanSuggestions(raw, alternatives) {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(alternatives.map((e) => [e.id, e]));
  const out = [];
  for (const item of raw) {
    if (out.length === MAX_SUGGESTIONS) break;
    if (!isObject(item)) continue;
    const exercise = byId.get(item.exercise_id);
    const reason = textBetween(item.reason, 1, MAX_REASON_LENGTH);
    if (!exercise || !reason || out.some((s) => s.exercise_id === exercise.id)) continue;
    out.push({ exercise_id: exercise.id, name: exercise.name, reason });
  }
  return out;
}

/**
 * Respuesta de n8n saneada: `{ response, suggestions }`. Un `response` inválido (falta,
 * vacío, no es texto o pasa de 1500) o un `{ error: … }` de n8n → 502 AI_INVALID_RESPONSE.
 */
export function validateChatResponse(raw, alternatives) {
  const response = isObject(raw) && raw.error == null ? textBetween(raw.response, 1, MAX_RESPONSE_LENGTH) : null;
  if (!response) {
    console.warn('[chat] respuesta inválida de n8n', isObject(raw) ? Object.keys(raw) : typeof raw);
    throw Errors.aiInvalidResponse(CHAT_INVALID_MESSAGE);
  }
  return { response, suggestions: cleanSuggestions(raw.suggestions, alternatives) };
}
