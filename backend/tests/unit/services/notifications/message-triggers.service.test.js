import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
const mockNotify = { notify: jest.fn(), pushOnly: jest.fn() };
const mockAuthRepo = { findTrainerById: jest.fn() };
jest.unstable_mockModule(src('services/notifications/notify.service.js'), () => mockNotify);
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockAuthRepo);
const { onMessageSent, onBroadcastSent } = await import(src('services/notifications/message-triggers.service.js'));

const STUDENT = { id: 'st-1', name: 'Lucía', trainer_id: 'tr-1' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockAuthRepo.findTrainerById.mockResolvedValue({ id: 'tr-1', name: 'Carla' });
  mockNotify.pushOnly.mockResolvedValue(undefined);
});

describe('onMessageSent', () => {
  it('PT escribe → push al alumno con el nombre del PT y data { type, student_id }', async () => {
    await onMessageSent({ student: STUDENT, senderRole: 'trainer', body: 'hola', hasImage: false });
    expect(mockAuthRepo.findTrainerById).toHaveBeenCalledWith('tr-1');
    expect(mockNotify.pushOnly).toHaveBeenCalledWith({
      userId: 'st-1', userRole: 'student', title: 'Carla', body: 'hola',
      data: { type: 'message', student_id: 'st-1' },
    });
  });

  it('alumno escribe → push a su PT con el nombre del alumno, sin buscar al PT', async () => {
    await onMessageSent({ student: STUDENT, senderRole: 'student', body: 'listo', hasImage: false });
    expect(mockAuthRepo.findTrainerById).not.toHaveBeenCalled();
    expect(mockNotify.pushOnly).toHaveBeenCalledWith({
      userId: 'tr-1', userRole: 'trainer', title: 'Lucía', body: 'listo',
      data: { type: 'message', student_id: 'st-1' },
    });
  });

  it('solo foto → "📷 Foto"; foto y texto → "📷 Foto · …"; texto largo, recortado', async () => {
    await onMessageSent({ student: STUDENT, senderRole: 'student', body: null, hasImage: true });
    await onMessageSent({ student: STUDENT, senderRole: 'student', body: 'mirá', hasImage: true });
    await onMessageSent({ student: STUDENT, senderRole: 'student', body: 'z'.repeat(200), hasImage: false });
    const bodies = mockNotify.pushOnly.mock.calls.map(([c]) => c.body);
    expect(bodies).toEqual(['📷 Foto', '📷 Foto · mirá', `${'z'.repeat(120)}…`]);
  });

  it('nunca crea fila en notifications (solo push)', async () => {
    await onMessageSent({ student: STUDENT, senderRole: 'trainer', body: 'hola', hasImage: false });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('PT inexistente → no hay push', async () => {
    mockAuthRepo.findTrainerById.mockResolvedValue(null);
    await onMessageSent({ student: STUDENT, senderRole: 'trainer', body: 'hola', hasImage: false });
    expect(mockNotify.pushOnly).not.toHaveBeenCalled();
  });

  it.each([
    ['falla el push', () => mockNotify.pushOnly.mockRejectedValue(new Error('fcm'))],
    ['falla buscar al PT', () => mockAuthRepo.findTrainerById.mockRejectedValue(new Error('fcm'))],
  ])('%s: no se propaga y se loguea', async (_n, arrange) => {
    arrange();
    await expect(
      onMessageSent({ student: STUDENT, senderRole: 'trainer', body: 'hola', hasImage: false })
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[notifications] message', 'fcm');
  });
});

describe('onBroadcastSent', () => {
  it('un push por alumno, con su student_id, buscando al PT una sola vez', async () => {
    await onBroadcastSent({ trainerId: 'tr-1', studentIds: ['a', 'b'], body: 'feriado' });
    expect(mockAuthRepo.findTrainerById).toHaveBeenCalledTimes(1);
    const data = (id) => ({ type: 'message', student_id: id });
    expect(mockNotify.pushOnly.mock.calls.map(([c]) => c)).toEqual([
      { userId: 'a', userRole: 'student', title: 'Carla', body: 'feriado', data: data('a') },
      { userId: 'b', userRole: 'student', title: 'Carla', body: 'feriado', data: data('b') },
    ]);
  });

  it('los pushes salen en paralelo: uno colgado no frena al siguiente', async () => {
    mockNotify.pushOnly.mockReturnValueOnce(new Promise(() => {}));
    void onBroadcastSent({ trainerId: 'tr-1', studentIds: ['a', 'b'], body: 'x' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockNotify.pushOnly).toHaveBeenCalledTimes(2);
  });

  it('un push que falla no corta a los demás ni se propaga', async () => {
    mockNotify.pushOnly.mockRejectedValueOnce(new Error('fcm'));
    await expect(
      onBroadcastSent({ trainerId: 'tr-1', studentIds: ['a', 'b'], body: 'x' })
    ).resolves.toBeUndefined();
    expect(mockNotify.pushOnly).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith('[notifications] message', 'fcm');
  });
});
