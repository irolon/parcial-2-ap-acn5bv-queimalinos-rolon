import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { Errors } from '../../../../../src/shared/utils/errors.js';
import {
  chatService,
  mockStudentsRepo,
  mockSessionsRepo,
  mockExercisesRepo,
  mockContextRepo,
  mockMessagesRepo,
  mockClient,
  STUDENT,
  STUDENT_ID,
  SESSION_ID,
  EX_BENCH,
  EX_DB,
  BENCH,
  ALTERNATIVES,
  NOW,
  DAY,
  session,
  dayMessages,
  inserted,
} from '../../../../helpers/chat/chat-service.setup.js';

const BODY = { message: '¿Con qué reemplazo el press de banca?', session_id: SESSION_ID, current_exercise_id: EX_BENCH };
const REPLY = { response: 'Probá con mancuernas.', suggestions: [{ exercise_id: EX_DB, reason: 'Mismo patrón' }] };
const send = (body = BODY) => chatService.sendMessage(STUDENT_ID, body, NOW);

describe('chat · chat.service · sendMessage', () => {
  let warn;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    mockSessionsRepo.findSessionById.mockResolvedValue(session());
    mockExercisesRepo.findExerciseById.mockResolvedValue(BENCH);
    mockContextRepo.findAlternatives.mockResolvedValue(ALTERNATIVES);
    mockMessagesRepo.findDayMessages.mockResolvedValue([]);
    mockMessagesRepo.insertExchange.mockImplementation(async (rows) => inserted(rows));
    mockClient.postToN8n.mockResolvedValue(REPLY);
  });
  afterEach(() => warn.mockRestore());

  it('manda a n8n exactamente message, exercise, student, alternatives e history, sin datos personales', async () => {
    await send();
    const [urlVar, payload, options] = mockClient.postToN8n.mock.calls[0];
    expect(urlVar).toBe('N8N_STUDENT_AI_WEBHOOK_URL');
    expect(Object.keys(payload)).toEqual(['message', 'exercise', 'student', 'alternatives', 'history']);
    expect(payload).toEqual({
      message: BODY.message,
      exercise: { name: 'Press banca plano', muscle_group: 'chest', equipment: 'barbell' },
      student: { goal: 'hypertrophy', level: 'intermediate', gym_equipment: ['dumbbell', 'machine'], injuries: 'Hombro derecho' },
      alternatives: ALTERNATIVES,
      history: [],
    });
    expect(options).toMatchObject({
      timeoutMs: 9000,
      tag: 'chat',
      unavailableMessage: 'El asistente no está disponible ahora. Seguí con tu entrenamiento.',
    });
    const sent = JSON.stringify(payload);
    for (const pii of [STUDENT.name, STUDENT.email, STUDENT.birth_date, STUDENT_ID, SESSION_ID]) expect(sent).not.toContain(pii);
  });

  it('busca los mensajes del día de Argentina', async () => {
    await send();
    expect(mockMessagesRepo.findDayMessages).toHaveBeenCalledWith(STUDENT_ID, DAY.from, DAY.to);
  });

  it('history: los últimos 6 mensajes del día, en orden, solo role y content', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(4));
    await send();
    expect(mockClient.postToN8n.mock.calls[0][1].history).toEqual([
      { role: 'user', content: 'pregunta 1' },
      { role: 'assistant', content: 'respuesta 1' },
      { role: 'user', content: 'pregunta 2' },
      { role: 'assistant', content: 'respuesta 2' },
      { role: 'user', content: 'pregunta 3' },
      { role: 'assistant', content: 'respuesta 3' },
    ]);
  });

  it('guarda el par en una inserción, con la sesión, y responde con el id de la respuesta y lo que queda', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(2));
    const data = await send();
    expect(mockMessagesRepo.insertExchange).toHaveBeenCalledTimes(1);
    expect(mockMessagesRepo.insertExchange).toHaveBeenCalledWith([
      { student_id: STUDENT_ID, session_id: SESSION_ID, role: 'user', content: BODY.message, created_at: NOW.toISOString() },
      {
        student_id: STUDENT_ID,
        session_id: SESSION_ID,
        role: 'assistant',
        content: 'Probá con mancuernas.',
        created_at: NOW.toISOString(),
      },
    ]);
    expect(data).toEqual({
      message_id: 'msg-assistant',
      response: 'Probá con mancuernas.',
      suggestions: [{ exercise_id: EX_DB, name: 'Press con mancuernas', reason: 'Mismo patrón' }],
      remaining_today: 17,
    });
  });

  it('sesión que todavía no está en el servidor: se responde y se guarda sin sesión', async () => {
    mockSessionsRepo.findSessionById.mockResolvedValue(null);
    await send();
    expect(mockMessagesRepo.insertExchange.mock.calls[0][0].map((r) => r.session_id)).toEqual([null, null]);
  });

  it('sin session_id ni ejercicio: exercise null y sin sesión', async () => {
    await send({ message: 'hola' });
    expect(mockClient.postToN8n.mock.calls[0][1].exercise).toBeNull();
    expect(mockSessionsRepo.findSessionById).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertExchange.mock.calls[0][0][0].session_id).toBeNull();
  });

  it('ejercicio inaccesible: se ignora y el chat sigue', async () => {
    mockExercisesRepo.findExerciseById.mockResolvedValue({ ...BENCH, is_global: false, trainer_id: 'otro' });
    await expect(send()).resolves.toMatchObject({ response: 'Probá con mancuernas.' });
    expect(mockClient.postToN8n.mock.calls[0][1].exercise).toBeNull();
  });

  it.each([
    ['sesión ajena', session({ student_id: 'otro' }), 404, 'SESSION_NOT_FOUND'],
    ['sesión terminada', session({ finished_at: '2026-11-07T14:00:00Z' }), 400, 'SESSION_FINISHED'],
  ])('%s → %i sin llamar a n8n ni guardar', async (_label, found, status, code) => {
    mockSessionsRepo.findSessionById.mockResolvedValue(found);
    await expect(send()).rejects.toMatchObject({ statusCode: status, code });
    expect(mockClient.postToN8n).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertExchange).not.toHaveBeenCalled();
  });

  it.each([
    ['n8n no disponible (timeout, 5xx o sin configuración)', () => Promise.reject(Errors.aiUnavailable('x')), 503],
    ['respuesta sin response', () => Promise.resolve({ suggestions: [] }), 502],
    ['response vacío', () => Promise.resolve({ response: '  ' }), 502],
    ['{ error } de n8n', () => Promise.resolve({ error: 'INVALID_JSON' }), 502],
  ])('%s → %i y no se guarda nada', async (_label, impl, status) => {
    mockClient.postToN8n.mockImplementation(impl);
    await expect(send()).rejects.toMatchObject({ statusCode: status });
    expect(mockMessagesRepo.insertExchange).not.toHaveBeenCalled();
  });

  it('sugerencias inventadas se descartan sin rechazar la respuesta', async () => {
    mockClient.postToN8n.mockResolvedValue({ response: 'Ok', suggestions: [{ exercise_id: EX_BENCH, reason: 'El mismo' }] });
    await expect(send()).resolves.toMatchObject({ response: 'Ok', suggestions: [] });
  });

  it('alumno inexistente → 404 STUDENT_NOT_FOUND', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(null);
    await expect(send()).rejects.toMatchObject({ statusCode: 404, code: 'STUDENT_NOT_FOUND' });
  });
});
