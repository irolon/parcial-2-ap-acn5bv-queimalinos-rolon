import { describe, it, expect, beforeEach } from '@jest/globals';
import { Errors } from '../../../../../src/shared/utils/errors.js';
import { CHAT_ATTEMPT_LIMIT } from '../../../../../src/models/chat/chat-message.model.js';
import {
  chatService,
  mockStudentsRepo,
  mockContextRepo,
  mockMessagesRepo,
  mockClient,
  STUDENT,
  STUDENT_ID,
  ALTERNATIVES,
  NOW,
  DAY,
  dayMessages,
  inserted,
} from '../../../../helpers/chat/chat-service.setup.js';

const send = (now = NOW) => chatService.sendMessage(STUDENT_ID, { message: 'hola' }, now);

describe('chat · chat.service · límite de 20 por día de Argentina', () => {
  beforeEach(() => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    mockContextRepo.findAlternatives.mockResolvedValue(ALTERNATIVES);
    mockMessagesRepo.insertExchange.mockImplementation(async (rows) => inserted(rows));
    mockClient.postToN8n.mockResolvedValue({ response: 'Ok' });
  });

  it('con 19 mensajes del alumno hoy pasa y queda 0', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(19));
    await expect(send()).resolves.toMatchObject({ remaining_today: 0 });
  });

  it('con 20 → 429 CHAT_LIMIT_REACHED sin llamar a n8n ni guardar', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(20));
    await expect(send()).rejects.toMatchObject({
      statusCode: 429,
      code: 'CHAT_LIMIT_REACHED',
      message: 'Llegaste al límite de consultas de hoy. Mañana podés seguir.',
    });
    expect(mockClient.postToN8n).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertExchange).not.toHaveBeenCalled();
  });

  it('solo cuentan los del alumno (role user), no las respuestas', async () => {
    const answers = dayMessages(10).filter((m) => m.role === 'assistant');
    mockMessagesRepo.findDayMessages.mockResolvedValue([...dayMessages(19), ...answers]);
    await expect(send()).resolves.toMatchObject({ remaining_today: 0 });
  });

  it('las fallas no se guardan, así que no cuentan: después de un 503 sigue quedando lo mismo', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(3));
    mockClient.postToN8n.mockRejectedValueOnce(Errors.aiUnavailable());
    await expect(send()).rejects.toMatchObject({ statusCode: 503 });
    await expect(send()).resolves.toMatchObject({ remaining_today: 16 });
  });

  it('las fallas sí cuentan para el tope de intentos por hora: pasado el tope → 429 sin llamar a n8n', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(3));
    mockClient.postToN8n.mockRejectedValue(Errors.aiUnavailable());
    for (let i = 0; i < CHAT_ATTEMPT_LIMIT; i += 1) await expect(send()).rejects.toMatchObject({ statusCode: 503 });
    mockClient.postToN8n.mockClear();
    await expect(send()).rejects.toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' });
    expect(mockClient.postToN8n).not.toHaveBeenCalled();
  });

  it('borde de medianoche: 23:59 AR cuenta en el día que termina, 00:00 AR en el nuevo', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue([]);
    await send(new Date('2026-11-08T02:59:59Z'));
    await send(new Date('2026-11-08T03:00:00Z'));
    expect(mockMessagesRepo.findDayMessages.mock.calls).toEqual([
      [STUDENT_ID, '2026-11-07T03:00:00.000Z', '2026-11-08T03:00:00.000Z'],
      [STUDENT_ID, '2026-11-08T03:00:00.000Z', '2026-11-09T03:00:00.000Z'],
    ]);
  });
});

describe('chat · chat.service · getToday', () => {
  it('los mensajes del día en orden, con id, role, content y created_at, y lo que queda', async () => {
    const rows = dayMessages(3);
    mockMessagesRepo.findDayMessages.mockResolvedValue(rows.map((r) => ({ ...r, session_id: 'x' })));
    const data = await chatService.getToday(STUDENT_ID, NOW);
    expect(mockMessagesRepo.findDayMessages).toHaveBeenCalledWith(STUDENT_ID, DAY.from, DAY.to);
    expect(data).toEqual({ messages: rows, remaining_today: 17 });
  });

  it('sin mensajes hoy: lista vacía y 20', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue([]);
    await expect(chatService.getToday(STUDENT_ID, NOW)).resolves.toEqual({ messages: [], remaining_today: 20 });
  });

  it('pasado el límite: 0, nunca negativo', async () => {
    mockMessagesRepo.findDayMessages.mockResolvedValue(dayMessages(21));
    await expect(chatService.getToday(STUDENT_ID, NOW)).resolves.toMatchObject({ remaining_today: 0 });
  });
});
