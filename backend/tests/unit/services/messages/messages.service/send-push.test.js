import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockMessagesRepo,
  mockImagesRepo,
  mockStudentsRepo,
  mockMessageTriggers,
  TRAINER,
  STUDENT,
  STUDENT_ID,
  studentRow,
  messageRow,
  PNG,
} from '../../../../helpers/messages/messages.setup.js';

const service = await import('../../../../../src/services/messages/messages.service.js');

const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.resetAllMocks();
  mockStudentsRepo.findStudentById.mockResolvedValue(studentRow());
  mockImagesRepo.signUrls.mockResolvedValue(new Map());
  mockMessagesRepo.insertMessage.mockImplementation(async (row) => messageRow(row));
});

describe('send: push del mensaje nuevo', () => {
  it.each([
    ['PT', TRAINER, 'trainer'],
    ['alumno', STUDENT, 'student'],
  ])('%s: avisa con el alumno, el rol de quien escribe, el texto y si trae foto', async (_n, user, role) => {
    await service.send(user, STUDENT_ID, { body: 'hola', file: { buffer: PNG } });
    await flush();
    expect(mockMessageTriggers.onMessageSent).toHaveBeenCalledWith({
      student: studentRow(), senderRole: role, body: 'hola', hasImage: true,
    });
  });

  it('no espera al push: responde aunque el trigger no termine nunca', async () => {
    mockMessageTriggers.onMessageSent.mockReturnValue(new Promise(() => {}));
    await expect(service.send(TRAINER, STUDENT_ID, { body: 'hola' })).resolves.toMatchObject({ body: 'hola' });
  });

  it.each([
    ['rechaza', () => mockMessageTriggers.onMessageSent.mockRejectedValue(new Error('fcm'))],
    ['tira', () => mockMessageTriggers.onMessageSent.mockImplementation(() => { throw new Error('fcm'); })],
  ])('si el trigger %s, el envío responde igual', async (_n, arrange) => {
    arrange();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(service.send(STUDENT, STUDENT_ID, { body: 'hola' })).resolves.toMatchObject({ body: 'hola' });
    await flush();
    expect(log).toHaveBeenCalledWith('[messages push]', 'fcm');
    log.mockRestore();
  });

  it('si falla el guardado no hay push', async () => {
    mockMessagesRepo.insertMessage.mockRejectedValue(new Error('db'));
    await expect(service.send(TRAINER, STUDENT_ID, { body: 'hola' })).rejects.toThrow('db');
    await flush();
    expect(mockMessageTriggers.onMessageSent).not.toHaveBeenCalled();
  });
});
