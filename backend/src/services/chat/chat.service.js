import { Errors } from '../../shared/utils/errors.js';
import * as studentsRepository from '../../repositories/students/students.repository.js';
import * as messagesRepository from '../../repositories/chat/chat-messages.repository.js';
import { postToN8n } from '../trainer-ai/n8n.client.js';
import { resolveSessionId, findCurrentExercise, buildChatContext } from './context.service.js';
import { validateChatResponse } from './response.js';
import {
  CHAT_DAILY_LIMIT,
  HISTORY_SIZE,
  CHAT_WEBHOOK_TIMEOUT_MS,
  CHAT_UNAVAILABLE_MESSAGE,
  CHAT_INVALID_MESSAGE,
  chatDayBounds,
  remainingToday,
} from '../../models/chat/chat-message.model.js';

const N8N_OPTIONS = {
  timeoutMs: CHAT_WEBHOOK_TIMEOUT_MS,
  tag: 'chat',
  unavailableMessage: CHAT_UNAVAILABLE_MESSAGE,
  invalidMessage: CHAT_INVALID_MESSAGE,
};

const usedToday = (messages) => messages.filter((m) => m.role === 'user').length;

/** Los mensajes del alumno del día de Argentina de `now`, más viejos primero. */
function findToday(studentId, now) {
  const { fromIso, toIso } = chatDayBounds(now);
  return messagesRepository.findDayMessages(studentId, fromIso, toIso);
}

/**
 * POST /chat: valida la sesión (si ya está en el servidor), aplica el límite de 20 por día,
 * arma el contexto sin datos personales con los últimos 6 mensajes del día, le pregunta a
 * n8n (10 s) y valida la respuesta. Solo si sale bien guarda el par en una inserción: las
 * fallas no se guardan ni cuentan para el límite. La sesión no se toca nunca.
 */
export async function sendMessage(studentId, body, now = new Date()) {
  const student = await studentsRepository.findStudentById(studentId);
  if (!student) throw Errors.studentNotFound();
  const sessionId = await resolveSessionId(studentId, body.session_id);
  const today = await findToday(studentId, now);
  const used = usedToday(today);
  if (used >= CHAT_DAILY_LIMIT) throw Errors.chatLimitReached();

  const exercise = await findCurrentExercise(student, body.current_exercise_id);
  const context = await buildChatContext(student, exercise);
  const history = today.slice(-HISTORY_SIZE).map(({ role, content }) => ({ role, content }));
  const raw = await postToN8n('N8N_STUDENT_AI_WEBHOOK_URL', { message: body.message, ...context, history }, N8N_OPTIONS);
  const reply = validateChatResponse(raw, context.alternatives);

  const rows = await messagesRepository.insertExchange([
    { student_id: studentId, session_id: sessionId, role: 'user', content: body.message },
    { student_id: studentId, session_id: sessionId, role: 'assistant', content: reply.response },
  ]);
  return {
    message_id: rows.find((r) => r.role === 'assistant').id,
    response: reply.response,
    suggestions: reply.suggestions,
    remaining_today: remainingToday(used + 1),
  };
}

/** GET /chat/today: la conversación del día (para recuperarla al recargar) y las consultas que quedan. */
export async function getToday(studentId, now = new Date()) {
  const today = await findToday(studentId, now);
  return {
    messages: today.map(({ id, role, content, created_at }) => ({ id, role, content, created_at })),
    remaining_today: remainingToday(usedToday(today)),
  };
}
