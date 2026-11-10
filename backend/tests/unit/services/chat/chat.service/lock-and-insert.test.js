import { describe, it, expect, beforeEach } from '@jest/globals';
import { Errors } from '../../../../../src/shared/utils/errors.js';
import { chatDayBounds } from '../../../../../src/models/chat/chat-message.model.js';
import {
  chatService,
  mockStudentsRepo,
  mockContextRepo,
  mockMessagesRepo,
  mockClient,
  STUDENT,
  STUDENT_ID,
  OTHER_STUDENT,
  ALTERNATIVES,
  NOW,
  dayMessages,
  inserted,
} from '../../../../helpers/chat/chat-service.setup.js';

const send = (studentId = STUDENT_ID, now = NOW) => chatService.sendMessage(studentId, { message: 'hola' }, now);
/** Una respuesta de n8n que queda pendiente hasta llamar a `answer()`. */
function pendingReply() {
  let answer;
  const promise = new Promise((resolve, reject) => {
    answer = { ok: () => resolve({ response: 'Ok' }), fail: () => reject(Errors.aiUnavailable()) };
  });
  mockClient.postToN8n.mockReturnValueOnce(promise);
  return answer;
}

describe('chat · chat.service · una consulta a la vez por alumno', () => {
  beforeEach(() => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    mockContextRepo.findAlternatives.mockResolvedValue(ALTERNATIVES);
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(19));
    mockMessagesRepo.insertExchange.mockImplementation(async (rows) => inserted(rows));
    mockClient.postToN8n.mockResolvedValue({ response: 'Ok' });
  });

  it('con una en curso (dos pestañas en 19), la segunda → 429 CHAT_IN_PROGRESS sin llamar a n8n: no se pasa de 20', async () => {
    const answer = pendingReply();
    const first = send();
    await expect(send()).rejects.toMatchObject({
      statusCode: 429,
      code: 'CHAT_IN_PROGRESS',
      message: 'Esperá la respuesta anterior.',
    });
    answer.ok();
    await expect(first).resolves.toMatchObject({ remaining_today: 0 });
    expect(mockClient.postToN8n).toHaveBeenCalledTimes(1);
    expect(mockMessagesRepo.insertExchange).toHaveBeenCalledTimes(1);
  });

  it('al terminar (bien o mal) libera el lugar: la siguiente pasa', async () => {
    const answer = pendingReply();
    const first = send();
    answer.fail();
    await expect(first).rejects.toMatchObject({ statusCode: 503 });
    await expect(send()).resolves.toMatchObject({ response: 'Ok' });
  });

  it('también libera si falla antes de n8n (alumno inexistente)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValueOnce(null);
    await expect(send()).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
    await expect(send()).resolves.toMatchObject({ response: 'Ok' });
  });

  it('el lugar es por alumno: otro alumno no espera', async () => {
    const answer = pendingReply();
    const first = send();
    await expect(send(OTHER_STUDENT)).resolves.toMatchObject({ response: 'Ok' });
    answer.ok();
    await first;
  });
});

describe('chat · chat.service · el par se guarda con el instante de la consulta', () => {
  beforeEach(() => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    mockContextRepo.findAlternatives.mockResolvedValue(ALTERNATIVES);
    mockMessagesRepo.findDayMessages.mockResolvedValue([]);
    mockMessagesRepo.insertExchange.mockImplementation(async (rows) => inserted(rows));
    mockClient.postToN8n.mockResolvedValue({ response: 'Ok' });
  });

  it('a las 23:59:55 de Argentina el par queda en ese día aunque n8n conteste pasada la medianoche', async () => {
    const now = new Date('2026-11-08T02:59:55Z');
    await send(STUDENT_ID, now);
    const rows = mockMessagesRepo.insertExchange.mock.calls[0][0];
    expect(rows.map((r) => [r.role, r.created_at])).toEqual([
      ['user', '2026-11-08T02:59:55.000Z'],
      ['assistant', '2026-11-08T02:59:55.000Z'],
    ]);
    const { fromIso, toIso } = chatDayBounds(now);
    for (const { created_at } of rows) expect(created_at >= fromIso && created_at < toIso).toBe(true);
  });

  it('inserción sin filas → 500 INTERNAL_ERROR claro, no un TypeError', async () => {
    mockMessagesRepo.insertExchange.mockResolvedValue([]);
    await expect(send()).rejects.toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'No se pudo guardar la respuesta del asistente',
    });
  });
});
