import * as messagesRepository from '../../repositories/chat/chat-messages.repository.js';
import { argentinaToUtc, utcToArgentina } from '../../shared/utils/dates/argentina.js';
import { groupByDay, historyCap } from '../../models/chat/chat-history.js';
import { CHAT_DAILY_LIMIT, toChatMessage } from '../../models/chat/chat-message.model.js';

/**
 * GET /chat/history: los días completos del alumno anteriores a `before` (por defecto hoy, que queda afuera: sale de
 * GET /chat/today), de a `days` y del más nuevo al más viejo. Pagina por fecha con `next_before`.
 */
export async function getHistory(studentId, { before, days }, now = new Date()) {
  const today = utcToArgentina(now).date;
  // Un before futuro se toma como hoy: hoy sale de GET /chat/today, nunca del historial.
  const day = before && before < today ? before : today;
  const beforeIso = argentinaToUtc(day, 0).toISOString();
  const rows = await messagesRepository.findMessagesBefore(studentId, beforeIso, historyCap(days, CHAT_DAILY_LIMIT));
  return groupByDay(rows.map(toChatMessage), days, CHAT_DAILY_LIMIT);
}
