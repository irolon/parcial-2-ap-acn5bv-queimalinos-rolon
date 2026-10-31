import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockStudents, mockTriggers, service, USER, STUDENT_ID, S1, row,
} from '../../../../helpers/sessions/session-history-service.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockRepo.findSessionById.mockResolvedValue(row(S1, { trainer_comment: 'Viejo' }));
  mockStudents.findStudentById.mockResolvedValue({ id: STUDENT_ID, trainer_id: USER.id });
  mockRepo.updateTrainerComment.mockImplementation(async (id, c) => row(id, { trainer_comment: c }));
  mockRepo.findSetsForSessions.mockResolvedValue([]);
  mockRepo.fetchSessionRecords.mockResolvedValue([]);
  mockRepo.findRoutinesByIds.mockResolvedValue([]);
});

describe('session-history.service · commentSession · disparador', () => {
  it('avisa con el comentario anterior y el nuevo, y responde igual', async () => {
    const out = await service.commentSession(USER, S1, { trainer_comment: 'Nuevo' });
    expect(mockTriggers.onSessionCommented).toHaveBeenCalledWith({
      session: expect.objectContaining({ id: S1 }),
      studentId: STUDENT_ID,
      previousComment: 'Viejo',
      comment: 'Nuevo',
    });
    expect(out.trainer_comment).toBe('Nuevo');
  });

  it('entrenador ajeno: 404 y no avisa', async () => {
    mockStudents.findStudentById.mockResolvedValue({ id: STUDENT_ID, trainer_id: 'otro' });
    await expect(service.commentSession(USER, S1, { trainer_comment: 'x' })).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(mockTriggers.onSessionCommented).not.toHaveBeenCalled();
  });
});
