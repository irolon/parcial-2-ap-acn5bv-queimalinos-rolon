import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockTriggers, service, STUDENT_ID, SESSION_ID,
} from '../../../../helpers/sessions/sessions-service.setup.js';

beforeEach(() => jest.resetAllMocks());

describe('sessions.service · discard (DELETE /sessions/:id)', () => {
  it('abierta y propia: la borra en una sola sentencia condicionada al alumno', async () => {
    mockRepo.deleteOpenSession.mockResolvedValueOnce(true);
    await expect(service.discard(STUDENT_ID, SESSION_ID)).resolves.toBeUndefined();
    expect(mockRepo.deleteOpenSession).toHaveBeenCalledWith(SESSION_ID, STUDENT_ID);
    // No lee antes de borrar: así no puede pisar una subida que la cerró en el medio.
    expect(mockRepo.findSessionById).not.toHaveBeenCalled();
    expect(mockTriggers.onSessionClosed).not.toHaveBeenCalled();
  });

  it('terminada, ajena o inexistente (no borró nada): 404 SESSION_NOT_FOUND', async () => {
    mockRepo.deleteOpenSession.mockResolvedValueOnce(false);
    await expect(service.discard(STUDENT_ID, SESSION_ID)).rejects.toMatchObject({
      statusCode: 404, code: 'SESSION_NOT_FOUND',
    });
  });

  it('un alumno no puede borrar la de otro: la sentencia filtra por el alumno del token', async () => {
    mockRepo.deleteOpenSession.mockResolvedValueOnce(false);
    await expect(service.discard('st-2', SESSION_ID)).rejects.toMatchObject({ statusCode: 404 });
    expect(mockRepo.deleteOpenSession).toHaveBeenCalledWith(SESSION_ID, 'st-2');
  });
});
