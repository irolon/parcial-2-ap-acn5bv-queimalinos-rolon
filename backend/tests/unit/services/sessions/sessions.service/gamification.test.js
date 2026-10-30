import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockEvaluate, service, STUDENT_ID, SESSION_ID, BODY, STORED,
} from '../../../../helpers/sessions/sessions-service.setup.js';

const FINISHED = '2026-10-27T11:00:00-03:00';
const BADGE = { code: 'first_session', name: 'Primera sesión', category: 'sessions' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockEvaluate.evaluateStudent.mockResolvedValue({ unlocked: [BADGE], streak: {} });
});

describe('sessions.service · evaluación de logros', () => {
  it('PATCH con finished_at evalúa y devuelve unlocked_achievements', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    mockRepo.updateSession.mockResolvedValueOnce({ ...STORED, finished_at: FINISHED });
    const res = await service.update(STUDENT_ID, SESSION_ID, { finished_at: FINISHED });
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledWith(STUDENT_ID);
    expect(res.unlocked_achievements).toEqual([BADGE]);
    expect(res.id).toBe(SESSION_ID);
  });

  it('PATCH sin finished_at no evalúa y devuelve []', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    mockRepo.updateSession.mockResolvedValueOnce({ ...STORED, rpe: 6 });
    const res = await service.update(STUDENT_ID, SESSION_ID, { rpe: 6 });
    expect(mockEvaluate.evaluateStudent).not.toHaveBeenCalled();
    expect(res.unlocked_achievements).toEqual([]);
  });

  it('si evaluateStudent tira, PATCH responde igual con []', async () => {
    mockEvaluate.evaluateStudent.mockRejectedValueOnce(new Error('boom'));
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    mockRepo.updateSession.mockResolvedValueOnce({ ...STORED, finished_at: FINISHED });
    const res = await service.update(STUDENT_ID, SESSION_ID, { finished_at: FINISHED });
    expect(res).toEqual({ ...STORED, finished_at: FINISHED, unlocked_achievements: [] });
    expect(console.error).toHaveBeenCalled();
  });

  it('POST que crea una sesión ya cerrada evalúa', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(null);
    mockRepo.insertSession.mockResolvedValueOnce({ ...STORED, finished_at: FINISHED });
    const res = await service.create(STUDENT_ID, { ...BODY, finished_at: FINISHED });
    expect(res.created).toBe(true);
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('POST que crea una sesión abierta no evalúa', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(null);
    mockRepo.insertSession.mockResolvedValueOnce(STORED);
    await service.create(STUDENT_ID, BODY);
    expect(mockEvaluate.evaluateStudent).not.toHaveBeenCalled();
  });

  it('reintento que completa finished_at evalúa', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(STORED);
    mockRepo.updateSession.mockResolvedValueOnce({ ...STORED, finished_at: FINISHED });
    await service.create(STUDENT_ID, { ...BODY, finished_at: FINISHED });
    expect(mockEvaluate.evaluateStudent).toHaveBeenCalledTimes(1);
  });

  it('si evaluateStudent tira, POST responde igual', async () => {
    mockEvaluate.evaluateStudent.mockRejectedValueOnce(new Error('boom'));
    mockRepo.findSessionById.mockResolvedValueOnce(null);
    mockRepo.insertSession.mockResolvedValueOnce({ ...STORED, finished_at: FINISHED });
    const res = await service.create(STUDENT_ID, { ...BODY, finished_at: FINISHED });
    expect(res).toEqual({ session: { ...STORED, finished_at: FINISHED }, created: true });
  });
});
