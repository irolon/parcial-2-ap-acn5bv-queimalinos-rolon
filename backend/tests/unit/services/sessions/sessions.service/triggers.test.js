import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockEvaluate, mockRepo, mockTriggers, service, STUDENT_ID, SESSION_ID, BODY, STORED,
} from '../../../../helpers/sessions/sessions-service.setup.js';

const UNLOCKED = [{ code: 'first', name: 'Primera', category: 'x' }];
const CLOSED = { ...STORED, finished_at: '2026-10-27T11:00:00-03:00' };

beforeEach(() => {
  jest.resetAllMocks();
  mockEvaluate.evaluateStudent.mockResolvedValue({ unlocked: UNLOCKED, streak: {} });
});

describe('sessions.service · disparadores de notificaciones', () => {
  it('PATCH que cierra: avisa con los logros y devuelve la misma respuesta', async () => {
    mockRepo.findSessionById.mockResolvedValue(STORED);
    mockRepo.updateSession.mockResolvedValue(CLOSED);
    const out = await service.update(STUDENT_ID, SESSION_ID, { finished_at: CLOSED.finished_at });
    expect(mockTriggers.onSessionClosed).toHaveBeenCalledWith({
      studentId: STUDENT_ID, session: CLOSED, unlocked: UNLOCKED,
    });
    expect(out).toEqual({ ...CLOSED, unlocked_achievements: UNLOCKED });
  });

  it('PATCH sin finished_at: no avisa', async () => {
    mockRepo.findSessionById.mockResolvedValue(STORED);
    mockRepo.updateSession.mockResolvedValue({ ...STORED, rpe: 7 });
    await service.update(STUDENT_ID, SESSION_ID, { rpe: 7 });
    expect(mockTriggers.onSessionClosed).not.toHaveBeenCalled();
  });

  it('POST que llega cerrada: avisa', async () => {
    mockRepo.findSessionById.mockResolvedValue(null);
    mockRepo.insertSession.mockResolvedValue(CLOSED);
    const out = await service.create(STUDENT_ID, { ...BODY, finished_at: CLOSED.finished_at });
    expect(out).toEqual({ session: CLOSED, created: true, unlocked_achievements: UNLOCKED });
    expect(mockTriggers.onSessionClosed).toHaveBeenCalledWith({
      studentId: STUDENT_ID, session: CLOSED, unlocked: UNLOCKED,
    });
  });
});
