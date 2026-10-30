import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockStudents, service, USER, STUDENT_ID, S1, row, set,
} from '../../../../helpers/sessions/session-history-service.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockRepo.findSessionById.mockResolvedValue(row(S1));
  mockStudents.findStudentById.mockResolvedValue({ id: STUDENT_ID, trainer_id: USER.id });
  mockRepo.updateTrainerComment.mockImplementation(async (id, c) => row(id, { trainer_comment: c }));
  mockRepo.findSetsForSessions.mockResolvedValue([set('a', S1)]);
  mockRepo.fetchSessionRecords.mockResolvedValue([{ session_id: S1, exercise_id: 'e-1' }]);
  mockRepo.findRoutinesByIds.mockResolvedValue([{ id: 'r-1', name: 'Push' }]);
});

describe('session-history.service · commentSession', () => {
  it('entrenador del alumno: guarda y devuelve el resumen igual al de la lista', async () => {
    const out = await service.commentSession(USER, S1, { trainer_comment: 'Bien!' });
    expect(mockRepo.updateTrainerComment).toHaveBeenCalledWith(S1, 'Bien!');
    expect(out).toEqual({
      id: S1,
      started_at: '2026-10-27T10:00:00Z',
      finished_at: '2026-10-27T10:54:00Z',
      duration_min: 54,
      routine: { id: 'r-1', name: 'Push' },
      rpe: 8,
      notes: 'ok',
      trainer_comment: 'Bien!',
      has_modifications: false,
      sets: 1,
      volume_kg: 500,
      has_pr: true,
    });
  });

  it('null borra el comentario', async () => {
    const out = await service.commentSession(USER, S1, { trainer_comment: null });
    expect(mockRepo.updateTrainerComment).toHaveBeenCalledWith(S1, null);
    expect(out.trainer_comment).toBeNull();
  });

  it('sesión inexistente: 404 SESSION_NOT_FOUND y no escribe', async () => {
    mockRepo.findSessionById.mockResolvedValueOnce(null);
    await expect(service.commentSession(USER, S1, { trainer_comment: 'x' })).rejects.toMatchObject({
      statusCode: 404, code: 'SESSION_NOT_FOUND',
    });
    expect(mockRepo.updateTrainerComment).not.toHaveBeenCalled();
  });

  it('alumno de otro entrenador: 404 (no 403) y no escribe', async () => {
    mockStudents.findStudentById.mockResolvedValueOnce({ id: STUDENT_ID, trainer_id: 'otro' });
    await expect(service.commentSession(USER, S1, { trainer_comment: 'x' })).rejects.toMatchObject({
      statusCode: 404, code: 'SESSION_NOT_FOUND',
    });
    expect(mockRepo.updateTrainerComment).not.toHaveBeenCalled();
  });

  it('alumno inexistente: 404', async () => {
    mockStudents.findStudentById.mockResolvedValueOnce(null);
    await expect(service.commentSession(USER, S1, { trainer_comment: 'x' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
