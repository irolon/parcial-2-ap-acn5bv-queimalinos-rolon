import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
const mockRepo = { findByStudent: jest.fn(), upsert: jest.fn() };
jest.unstable_mockModule(src('repositories/notifications/preferences.repository.js'), () => mockRepo);
const service = await import(src('services/notifications/preferences.service.js'));

const STUDENT = { id: 'st-1', role: 'student' };
const TRAINER = { id: 'tr-1', role: 'trainer' };
const ALL_ON = { message: true, comment: true, appointment: true, pr: true, achievement: true };

beforeEach(() => {
  jest.resetAllMocks();
  mockRepo.findByStudent.mockResolvedValue(null);
});

describe('get', () => {
  it('sin fila: todo prendido y updated_at null', async () => {
    await expect(service.get(STUDENT)).resolves.toEqual({ ...ALL_ON, updated_at: null });
    expect(mockRepo.findByStudent).toHaveBeenCalledWith('st-1');
  });

  it('con fila: la devuelve mapeada', async () => {
    mockRepo.findByStudent.mockResolvedValue({ ...ALL_ON, pr: false, updated_at: 'X' });
    await expect(service.get(STUDENT)).resolves.toEqual({ ...ALL_ON, pr: false, updated_at: 'X' });
  });
});

describe('replace', () => {
  it('upsert con el id del usuario y solo los cinco tipos (ignora student_id de otro)', async () => {
    mockRepo.upsert.mockResolvedValue({ ...ALL_ON, comment: false, updated_at: 'X' });
    const body = { ...ALL_ON, comment: false, student_id: 'otro', extra: 1 };
    await expect(service.replace(STUDENT, body)).resolves.toEqual({ ...ALL_ON, comment: false, updated_at: 'X' });
    expect(mockRepo.upsert).toHaveBeenCalledWith('st-1', { ...ALL_ON, comment: false }, expect.any(String));
    expect(new Date(mockRepo.upsert.mock.calls[0][2]).toISOString()).toBe(mockRepo.upsert.mock.calls[0][2]);
  });
});

describe.each([
  ['get', () => service.get(TRAINER)],
  ['replace', () => service.replace(TRAINER, ALL_ON)],
])('%s con trainer', (_n, call) => {
  it('→ 403 sin tocar el repo', async () => {
    await expect(call()).rejects.toMatchObject({ statusCode: 403 });
    expect(mockRepo.findByStudent).not.toHaveBeenCalled();
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });
});

describe('isPushAllowed', () => {
  it('trainer → true sin leer (los ids pueden repetirse entre tablas)', async () => {
    mockRepo.findByStudent.mockResolvedValue({ ...ALL_ON, message: false, updated_at: 'X' });
    await expect(service.isPushAllowed('tr-1', 'trainer', 'message')).resolves.toBe(true);
    expect(mockRepo.findByStudent).not.toHaveBeenCalled();
  });

  it('alumno con comment apagado: comment no, pr sí', async () => {
    mockRepo.findByStudent.mockResolvedValue({ ...ALL_ON, comment: false, updated_at: 'X' });
    await expect(service.isPushAllowed('st-1', 'student', 'comment')).resolves.toBe(false);
    await expect(service.isPushAllowed('st-1', 'student', 'pr')).resolves.toBe(true);
    expect(mockRepo.findByStudent).toHaveBeenCalledWith('st-1');
  });

  it('alumno sin fila → true', async () => {
    await expect(service.isPushAllowed('st-1', 'student', 'achievement')).resolves.toBe(true);
  });

  it('si la lectura falla, lanza (el catch está en notify)', async () => {
    mockRepo.findByStudent.mockRejectedValue(new Error('db'));
    await expect(service.isPushAllowed('st-1', 'student', 'comment')).rejects.toThrow('db');
  });
});
