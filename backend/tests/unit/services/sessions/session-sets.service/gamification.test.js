import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockEvaluate, service, STUDENT_ID, SESSION_ID, SESSION, arrange, rawSet,
} from '../../../../helpers/sessions/session-sets-service.setup.js';

const BADGE = { code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' };
const CLOSED = { ...SESSION, finished_at: '2026-10-27T11:00:00-03:00' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  arrange();
  mockEvaluate.evaluateStudent.mockResolvedValue({ unlocked: [], streak: {} });
});

describe('session-sets.service · evaluación de logros', () => {
  it('series guardadas en sesión cerrada: evalúa', async () => {
    arrange({ session: CLOSED });
    mockEvaluate.evaluateStudent.mockResolvedValue({ unlocked: [BADGE], streak: {} });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledWith(STUDENT_ID);
    expect(res.unlocked_achievements).toEqual([BADGE]);
  });

  it('sesión abierta: no evalúa', async () => {
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(mockEvaluate.evaluateStudent).not.toHaveBeenCalled();
    expect(res.unlocked_achievements).toEqual([]);
  });

  it('sesión cerrada pero ninguna serie guardada: no evalúa', async () => {
    arrange({ session: CLOSED, accessible: [] });
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(mockEvaluate.evaluateStudent).not.toHaveBeenCalled();
    expect(res.unlocked_achievements).toEqual([]);
  });

  it('si evaluateStudent tira, la respuesta es la misma', async () => {
    arrange({ session: CLOSED });
    mockEvaluate.evaluateStudent.mockRejectedValueOnce(new Error('boom'));
    const res = await service.addSets(STUDENT_ID, SESSION_ID, { sets: [rawSet(1)] });
    expect(res.saved).toHaveLength(1);
    expect(res.unlocked_achievements).toEqual([]);
  });
});
