import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo,
  mockEvaluate,
  mockTriggers,
  service,
  STUDENT_ID,
  SESSION_ID,
  SESSION,
  EX_A,
  EX_B,
  arrange,
  rawSet,
  setId,
} from '../../../../helpers/sessions/session-sets-service.setup.js';

beforeEach(() => jest.resetAllMocks());

describe('session-sets.service · addSets con un update que falla a mitad', () => {
  it('rechaza sin marcar la sesión, sin evaluar logros y sin disparar avisos', async () => {
    // Sesión cerrada + una sustitución: si el lote terminara, se marcaría y evaluaría.
    arrange({
      session: { ...SESSION, finished_at: '2026-10-27T11:00:00-03:00' },
      existing: [{ id: setId(2), session_id: SESSION_ID }],
    });
    mockRepo.updateSetInSession.mockRejectedValue(new Error('timeout'));
    const sets = [rawSet(1, { exercise_id: EX_B, original_exercise_id: EX_A }), rawSet(2)];

    await expect(service.addSets(STUDENT_ID, SESSION_ID, { sets })).rejects.toThrow('timeout');

    expect(mockRepo.insertNewSets).toHaveBeenCalledTimes(1);
    expect(mockRepo.markSessionModified).not.toHaveBeenCalled();
    expect(mockEvaluate.evaluateStudent).not.toHaveBeenCalled();
    expect(mockTriggers.onSessionClosed).not.toHaveBeenCalled();
    expect(mockTriggers.onSessionModified).not.toHaveBeenCalled();
  });
});
