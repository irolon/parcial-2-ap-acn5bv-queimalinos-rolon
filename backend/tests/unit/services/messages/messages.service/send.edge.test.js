import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockMessagesRepo,
  mockImagesRepo,
  mockStudentsRepo,
  TRAINER,
  STUDENT,
  STUDENT_ID,
  studentRow,
  messageRow,
  PNG,
} from '../../../../helpers/messages/messages.setup.js';

const service = await import('../../../../../src/services/messages/messages.service.js');

beforeEach(() => {
  jest.resetAllMocks();
  mockStudentsRepo.findStudentById.mockResolvedValue(studentRow());
  mockImagesRepo.signUrls.mockResolvedValue(new Map());
  mockMessagesRepo.insertMessage.mockImplementation(async (row) => messageRow(row));
});

describe('send: firma posterior al insert (best-effort)', () => {
  it('si falla signUrls después del insert no da 500: devuelve el mensaje con image_url null', async () => {
    mockImagesRepo.signUrls.mockRejectedValue(new Error('firma caída'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const msg = await service.send(TRAINER, STUDENT_ID, { body: 'hola', file: { buffer: PNG } });
    expect(mockMessagesRepo.insertMessage).toHaveBeenCalledTimes(1);
    expect(msg).toMatchObject({ body: 'hola', image_url: null });
    expect(mockImagesRepo.removeImage).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('send: alumno inactivo', () => {
  it.each([
    ['PT', TRAINER],
    ['alumno', STUDENT],
  ])('%s: 409 STUDENT_INACTIVE y no guarda ni sube nada', async (_n, user) => {
    mockStudentsRepo.findStudentById.mockResolvedValue(studentRow({ active: false }));
    await expect(
      service.send(user, STUDENT_ID, { body: 'hola', file: { buffer: PNG } })
    ).rejects.toMatchObject({ statusCode: 409, code: 'STUDENT_INACTIVE', message: 'El alumno está dado de baja' });
    expect(mockImagesRepo.uploadImage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertMessage).not.toHaveBeenCalled();
  });

  it('leer el historial de un alumno inactivo sigue permitido', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(studentRow({ active: false }));
    mockMessagesRepo.findPage.mockResolvedValue([]);
    await expect(service.history(TRAINER, STUDENT_ID, { before: null, limit: 50 })).resolves.toMatchObject({
      data: [],
    });
  });
});
