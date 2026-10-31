import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockMessagesRepo,
  mockImagesRepo,
  mockStudentsRepo,
  mockAuthRepo,
  TRAINER,
  STUDENT,
  STUDENT_ID,
  OTHER_TRAINER_ID,
  OTHER_STUDENT_ID,
  studentRow,
  messageRow,
  PNG,
  PDF,
} from '../../../helpers/messages/messages.setup.js';

const service = await import('../../../../src/services/messages/messages.service.js');

beforeEach(() => {
  jest.resetAllMocks();
  mockStudentsRepo.findStudentById.mockResolvedValue(studentRow());
  mockImagesRepo.signUrls.mockResolvedValue(new Map());
});

describe('acceso (Review Focus 2)', () => {
  const calls = [
    ['history', (u, id) => service.history(u, id, { before: null, limit: 50 })],
    ['send', (u, id) => service.send(u, id, { body: 'hola', file: undefined })],
    ['markRead', (u, id) => service.markRead(u, id)],
  ];

  it.each(calls)('%s: un PT ajeno recibe 403 y no toca mensajes', async (_n, call) => {
    mockStudentsRepo.findStudentById.mockResolvedValue(studentRow({ trainer_id: OTHER_TRAINER_ID }));
    await expect(call(TRAINER, STUDENT_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockMessagesRepo.findPage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertMessage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.markRead).not.toHaveBeenCalled();
  });

  it.each(calls)('%s: un alumno en la conversación de otro recibe 403', async (_n, call) => {
    await expect(call(STUDENT, OTHER_STUDENT_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each(calls)('%s: alumno inexistente da el mismo 403', async (_n, call) => {
    mockStudentsRepo.findStudentById.mockResolvedValue(null);
    await expect(call(TRAINER, STUDENT_ID)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('history', () => {
  const rows = (n) =>
    Array.from({ length: n }, (_, i) =>
      messageRow({ id: `m-${i}`, created_at: `2026-10-31T12:00:${String(59 - i).padStart(2, '0')}.000Z` })
    );

  it('devuelve orden cronológico y next_before null si no hay más', async () => {
    mockMessagesRepo.findPage.mockResolvedValue(rows(3));
    const res = await service.history(TRAINER, STUDENT_ID, { before: null, limit: 3 });
    expect(res.data.map((m) => m.id)).toEqual(['m-2', 'm-1', 'm-0']);
    expect(res.meta).toEqual({ next_before: null });
  });

  it('con una fila de más descarta la sobrante y next_before es el created_at del más viejo', async () => {
    mockMessagesRepo.findPage.mockResolvedValue(rows(4));
    const res = await service.history(TRAINER, STUDENT_ID, { before: 'B', limit: 3 });
    expect(mockMessagesRepo.findPage).toHaveBeenCalledWith(STUDENT_ID, { before: 'B', limit: 3 });
    expect(res.data.map((m) => m.id)).toEqual(['m-2', 'm-1', 'm-0']);
    expect(res.meta.next_before).toBe('2026-10-31T12:00:57.000Z');
  });

  it('firma las fotos en un solo pedido y no expone image_path', async () => {
    mockMessagesRepo.findPage.mockResolvedValue([
      messageRow({ id: 'a', image_path: 's/a.png' }),
      messageRow({ id: 'b' }),
    ]);
    mockImagesRepo.signUrls.mockResolvedValue(new Map([['s/a.png', 'https://firmada/a']]));
    const res = await service.history(TRAINER, STUDENT_ID, { before: null, limit: 50 });
    expect(mockImagesRepo.signUrls).toHaveBeenCalledTimes(1);
    expect(mockImagesRepo.signUrls).toHaveBeenCalledWith(['s/a.png']);
    const byId = Object.fromEntries(res.data.map((m) => [m.id, m]));
    expect(byId.a.image_url).toBe('https://firmada/a');
    expect(byId.b.image_url).toBeNull();
    expect(JSON.stringify(res)).not.toContain('image_path');
  });

  it('counterpart del PT es el alumno', async () => {
    mockMessagesRepo.findPage.mockResolvedValue([]);
    const res = await service.history(TRAINER, STUDENT_ID, { before: null, limit: 50 });
    expect(res.counterpart).toEqual({ id: STUDENT_ID, name: 'Ana', avatar_url: null });
    expect(mockAuthRepo.findTrainerById).not.toHaveBeenCalled();
  });

  it('counterpart del alumno es su PT', async () => {
    mockMessagesRepo.findPage.mockResolvedValue([]);
    mockAuthRepo.findTrainerById.mockResolvedValue({ id: TRAINER.id, name: 'Pablo', avatar_url: 'u', email: 'x' });
    const res = await service.history(STUDENT, STUDENT_ID, { before: null, limit: 50 });
    expect(mockAuthRepo.findTrainerById).toHaveBeenCalledWith(TRAINER.id);
    expect(res.counterpart).toEqual({ id: TRAINER.id, name: 'Pablo', avatar_url: 'u' });
  });
});

describe('send', () => {
  beforeEach(() => {
    mockMessagesRepo.insertMessage.mockImplementation(async (row) => messageRow(row));
  });

  it('sin texto ni foto → MESSAGE_EMPTY', async () => {
    await expect(service.send(TRAINER, STUDENT_ID, { body: null, file: undefined })).rejects.toMatchObject({
      statusCode: 400,
      code: 'MESSAGE_EMPTY',
    });
  });

  it('texto: sender_role es el del usuario y no sube nada', async () => {
    const msg = await service.send(STUDENT, STUDENT_ID, { body: 'hola', file: undefined });
    expect(mockMessagesRepo.insertMessage).toHaveBeenCalledWith({
      student_id: STUDENT_ID,
      sender_role: 'student',
      body: 'hola',
      image_path: null,
    });
    expect(mockImagesRepo.uploadImage).not.toHaveBeenCalled();
    expect(msg).toMatchObject({ sender_role: 'student', image_url: null });
  });

  it('foto PNG: sube a <studentId>/<uuid>.png con el tipo detectado y devuelve la URL firmada', async () => {
    mockImagesRepo.signUrls.mockImplementation(async (paths) => new Map(paths.map((p) => [p, `https://f/${p}`])));
    const msg = await service.send(TRAINER, STUDENT_ID, { body: null, file: { buffer: PNG, mimetype: 'image/jpeg' } });
    const [path, buffer, contentType] = mockImagesRepo.uploadImage.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${STUDENT_ID}/[0-9a-f-]{36}\\.png$`));
    expect(buffer).toBe(PNG);
    expect(contentType).toBe('image/png');
    expect(mockMessagesRepo.insertMessage).toHaveBeenCalledWith(
      expect.objectContaining({ body: null, image_path: path })
    );
    expect(msg.image_url).toBe(`https://f/${path}`);
    expect(JSON.stringify(msg)).not.toContain('image_path');
  });

  it('PDF con Content-Type image/png → 415 y nada sube a Storage (Review Focus 1)', async () => {
    const file = { buffer: PDF, mimetype: 'image/png', originalname: 'a.png' };
    await expect(service.send(TRAINER, STUDENT_ID, { body: 'hola', file })).rejects.toMatchObject({
      statusCode: 415,
      code: 'IMAGE_TYPE_INVALID',
    });
    expect(mockImagesRepo.uploadImage).not.toHaveBeenCalled();
    expect(mockMessagesRepo.insertMessage).not.toHaveBeenCalled();
  });

  it('si falla la inserción borra la foto subida y relanza el error original', async () => {
    const boom = new Error('db caída');
    mockMessagesRepo.insertMessage.mockRejectedValue(boom);
    mockImagesRepo.removeImage.mockResolvedValue();
    await expect(service.send(TRAINER, STUDENT_ID, { body: null, file: { buffer: PNG } })).rejects.toBe(boom);
    const uploaded = mockImagesRepo.uploadImage.mock.calls[0][0];
    expect(mockImagesRepo.removeImage).toHaveBeenCalledWith(uploaded);
  });

  it('si además falla el borrado, igual relanza el error de la inserción', async () => {
    const boom = new Error('db caída');
    mockMessagesRepo.insertMessage.mockRejectedValue(boom);
    mockImagesRepo.removeImage.mockRejectedValue(new Error('storage caído'));
    await expect(service.send(TRAINER, STUDENT_ID, { body: null, file: { buffer: PNG } })).rejects.toBe(boom);
  });
});

describe('markRead', () => {
  it('el PT marca los mensajes del alumno', async () => {
    mockMessagesRepo.markRead.mockResolvedValue(2);
    await expect(service.markRead(TRAINER, STUDENT_ID)).resolves.toEqual({ updated: 2 });
    expect(mockMessagesRepo.markRead).toHaveBeenCalledWith(STUDENT_ID, 'student');
  });

  it('el alumno marca los del PT', async () => {
    mockMessagesRepo.markRead.mockResolvedValue(0);
    await expect(service.markRead(STUDENT, STUDENT_ID)).resolves.toEqual({ updated: 0 });
    expect(mockMessagesRepo.markRead).toHaveBeenCalledWith(STUDENT_ID, 'trainer');
  });
});

describe('unreadCount', () => {
  it('PT: mensajes de alumnos sin leer en todos sus alumnos activos', async () => {
    mockStudentsRepo.findActiveStudentsByTrainer.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    mockMessagesRepo.countUnread.mockResolvedValue(7);
    await expect(service.unreadCount(TRAINER)).resolves.toEqual({ count: 7 });
    expect(mockMessagesRepo.countUnread).toHaveBeenCalledWith({ studentIds: ['a', 'b'], senderRole: 'student' });
  });

  it('alumno: mensajes del PT sin leer en su conversación', async () => {
    mockMessagesRepo.countUnread.mockResolvedValue(3);
    await expect(service.unreadCount(STUDENT)).resolves.toEqual({ count: 3 });
    expect(mockMessagesRepo.countUnread).toHaveBeenCalledWith({ studentIds: [STUDENT_ID], senderRole: 'trainer' });
  });
});
