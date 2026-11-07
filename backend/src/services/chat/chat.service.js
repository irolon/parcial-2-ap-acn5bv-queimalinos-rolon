import { Errors } from '../../shared/utils/errors.js';
import * as studentsRepository from '../../repositories/students/students.repository.js';
import * as messagesRepository from '../../repositories/chat/chat-messages.repository.js';
import { postToN8n } from '../../shared/utils/n8n.client.js';
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

// Alumnos con una consulta en curso (por proceso). Entre leer el día y guardar el par pasan hasta 9 s de n8n:
// sin esto, dos envíos a la vez (dos pestañas, web y celular) con 19 pasarían los dos y quedarían 21.
const inFlight = new Set();

/** El par a guardar, los dos con el instante de la consulta: así cuentan en el mismo día que se leyó. */
function exchangeRows(studentId, sessionId, message, reply, now) {
  const base = { student_id: studentId, session_id: sessionId, created_at: now.toISOString() };
  return [
    { ...base, role: 'user', content: message },
    { ...base, role: 'assistant', content: reply },
  ];
}

async function answer(studentId, body, now) {
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

  const rows = await messagesRepository.insertExchange(exchangeRows(studentId, sessionId, body.message, reply.response, now));
  const saved = rows?.find((r) => r.role === 'assistant');
  if (!saved) throw Errors.internal('No se pudo guardar la respuesta del asistente');
  return {
    message_id: saved.id,
    response: reply.response,
    suggestions: reply.suggestions,
    remaining_today: remainingToday(used + 1),
  };
}

/**
 * POST /chat: una consulta a la vez por alumno (la segunda en paralelo es 429 CHAT_IN_PROGRESS); valida la sesión
 * (si ya está en el servidor), aplica el límite de 20 por día, arma el contexto sin datos personales con los últimos
 * 6 mensajes del día, le pregunta a n8n (9 s) y valida la respuesta. Solo si sale bien guarda el par en una
 * inserción, con created_at = `now` (el día que se leyó, aunque n8n conteste pasada la medianoche): las fallas no
 * se guardan ni cuentan para el límite. La sesión no se toca nunca.
 */
export async function sendMessage(studentId, body, now = new Date()) {
  if (inFlight.has(studentId)) throw Errors.chatInProgress();
  inFlight.add(studentId);
  try {
    return await answer(studentId, body, now);
  } finally {
    inFlight.delete(studentId);
  }
}

/** GET /chat/today: la conversación del día (para recuperarla al recargar) y las consultas que quedan. */
export async function getToday(studentId, now = new Date()) {
  const today = await findToday(studentId, now);
  return {
    messages: today.map(({ id, role, content, created_at }) => ({ id, role, content, created_at })),
    remaining_today: remainingToday(usedToday(today)),
  };
}
