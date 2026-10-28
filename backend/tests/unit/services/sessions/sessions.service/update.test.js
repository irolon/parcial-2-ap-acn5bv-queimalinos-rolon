import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, service, STUDENT_ID, SESSION_ID, STORED,
} from '../../../../helpers/sessions/sessions-service.setup.js';

beforeEach(() => jest.resetAllMocks());

describe('sessions.service · getOwnedSession', () => {
  it('devuelve la sesión del alumno', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    expect(await service.getOwnedSession(STUDENT_ID, SESSION_ID)).toEqual(STORED);
  });

  it('sesión ajena: 404 SESSION_NOT_FOUND', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce({ ...STORED, student_id: 'st-2' });
    await expect(service.getOwnedSession(STUDENT_ID, SESSION_ID)).rejects.toMatchObject({
      statusCode: 404, code: 'SESSION_NOT_FOUND',
    });
  });

  it('sesión inexistente: 404 SESSION_NOT_FOUND', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(null);
    await expect(service.getOwnedSession(STUDENT_ID, SESSION_ID)).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });
});

describe('sessions.service · update', () => {
  it('cierra la sesión con finished_at y rpe', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    const closed = { ...STORED, finished_at: '2026-10-27T11:00:00-03:00', rpe: 8 };
    mockRepo.updateSession.mockResolvedValueOnce(closed);
    const body = { finished_at: '2026-10-27T11:00:00-03:00', rpe: 8 };
    expect(await service.update(STUDENT_ID, SESSION_ID, body)).toEqual(closed);
    expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, body);
  });

  it('sesión ajena o inexistente: 404 y no actualiza', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce({ ...STORED, student_id: 'st-2' });
    await expect(service.update(STUDENT_ID, SESSION_ID, { rpe: 5 })).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
    expect(mockRepo.updateSession).not.toHaveBeenCalled();
  });

  it('finished_at anterior al started_at guardado: VALIDATION_ERROR en finished_at', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    await expect(
      service.update(STUDENT_ID, SESSION_ID, { finished_at: '2026-10-27T09:00:00-03:00' })
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field: 'finished_at' })],
    });
    expect(mockRepo.updateSession).not.toHaveBeenCalled();
  });

  it('corregir solo el rpe no chequea fechas', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    mockRepo.updateSession.mockResolvedValueOnce({ ...STORED, rpe: 6 });
    await service.update(STUDENT_ID, SESSION_ID, { rpe: 6 });
    expect(mockRepo.updateSession).toHaveBeenCalledWith(SESSION_ID, { rpe: 6 });
  });
});
