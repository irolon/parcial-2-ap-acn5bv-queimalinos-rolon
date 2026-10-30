import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockEvaluate, mockTriggers, service, STUDENT_ID, SESSION_ID, SESSION, EX_A, EX_B, arrange, rawSet,
} from '../../../../helpers/sessions/session-sets-service.setup.js';

const CLOSED = { ...SESSION, finished_at: '2026-10-27T11:00:00-03:00' };
const UNLOCKED = [{ code: 'first', name: 'Primera', category: 'x' }];

beforeEach(() => {
  jest.resetAllMocks();
  arrange();
  mockEvaluate.evaluateStudent.mockResolvedValue({ unlocked: UNLOCKED, streak: {} });
});

describe('session-sets.service · disparadores de notificaciones', () => {
  it('sustitución: avisa con from/to de las series guardadas', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1, { original_exercise_id: EX_B })] });
    expect(mockTriggers.onSessionModified).toHaveBeenCalledWith({
      studentId: STUDENT_ID, session: SESSION, substitutions: [{ from: EX_B, to: EX_A }],
    });
  });

  it('sin sustituciones: no avisa', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(mockTriggers.onSessionModified).not.toHaveBeenCalled();
  });

  it('sesión cerrada: pasa los logros desbloqueados a onSessionClosed', async () => {
    arrange({ session: CLOSED });
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(mockTriggers.onSessionClosed).toHaveBeenCalledWith({
      studentId: STUDENT_ID, session: CLOSED, unlocked: UNLOCKED,
    });
  });

  it('sesión abierta: no llama a onSessionClosed', async () => {
    await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(mockTriggers.onSessionClosed).not.toHaveBeenCalled();
  });
});
