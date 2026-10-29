import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockRepo, mockAccess, service, USER, STUDENT_ID, S1, row, set,
} from '../../../../helpers/sessions/session-history-service.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockAccess.assertCanAccessStudent.mockResolvedValue({ id: STUDENT_ID });
  mockRepo.findStudentSession.mockResolvedValue(row(S1));
  mockRepo.findSetsForSessions.mockResolvedValue([]);
  mockRepo.fetchSessionRecords.mockResolvedValue([]);
  mockRepo.findRoutinesByIds.mockResolvedValue([{ id: 'r-1', name: 'Push' }]);
  mockRepo.findRoutineExercisesByIds.mockResolvedValue([]);
  mockRepo.findExercisesByIds.mockResolvedValue([]);
});

describe('session-history.service · getSessionDetail', () => {
  it('sin permiso: propaga el 403 y no consulta la sesión', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValueOnce(new Error('forbidden'));
    await expect(service.getSessionDetail(USER, STUDENT_ID, S1)).rejects.toThrow('forbidden');
    expect(mockRepo.findStudentSession).not.toHaveBeenCalled();
  });

  it('sesión de otro alumno o inexistente: 404 SESSION_NOT_FOUND', async () => {
    mockRepo.findStudentSession.mockResolvedValueOnce(null);
    await expect(service.getSessionDetail(USER, STUDENT_ID, S1)).rejects.toMatchObject({
      statusCode: 404, code: 'SESSION_NOT_FOUND',
    });
    expect(mockRepo.findStudentSession).toHaveBeenCalledWith(STUDENT_ID, S1);
  });

  it('resumen + ejercicios con sustitución, planned null e is_pr', async () => {
    mockRepo.findSetsForSessions.mockResolvedValueOnce([
      set('a', S1, { exercise_id: 'e-2', original_exercise_id: 'e-1', routine_exercise_id: 're-1' }),
      set('b', S1, { exercise_id: 'e-3', executed_at: '2026-10-27T10:30:00Z' }),
    ]);
    mockRepo.fetchSessionRecords.mockResolvedValueOnce([{ session_id: S1, exercise_id: 'e-2' }]);
    mockRepo.findRoutineExercisesByIds.mockResolvedValueOnce([
      { id: 're-1', sets: 4, reps: 10, suggested_kg: 60 },
    ]);
    mockRepo.findExercisesByIds.mockResolvedValueOnce([
      { id: 'e-1', name: 'Press mancuernas' },
      { id: 'e-2', name: 'Press banca' },
      { id: 'e-3', name: 'Remo' },
    ]);
    const d = await service.getSessionDetail(USER, STUDENT_ID, S1);
    expect(d).toMatchObject({ id: S1, has_pr: true, routine: { id: 'r-1', name: 'Push' } });
    expect(d.exercises).toHaveLength(2);
    expect(d.exercises[0]).toMatchObject({
      exercise: { id: 'e-2', name: 'Press banca' },
      original_exercise: { id: 'e-1', name: 'Press mancuernas' },
      planned: { sets: 4, reps: 10, suggested_kg: 60 },
      is_pr: true,
    });
    expect(d.exercises[1]).toMatchObject({ original_exercise: null, planned: null, is_pr: false });
  });

  it('sin rutina (routine_id null): routine null y todo planned null', async () => {
    mockRepo.findStudentSession.mockResolvedValueOnce(row(S1, { routine_id: null }));
    mockRepo.findSetsForSessions.mockResolvedValueOnce([set('a', S1), set('b', S1, { exercise_id: 'e-2' })]);
    mockRepo.findExercisesByIds.mockResolvedValueOnce([{ id: 'e-1', name: 'A' }, { id: 'e-2', name: 'B' }]);
    const d = await service.getSessionDetail(USER, STUDENT_ID, S1);
    expect(d.routine).toBeNull();
    expect(mockRepo.findRoutinesByIds).not.toHaveBeenCalled();
    expect(d.exercises).toHaveLength(2);
    expect(d.exercises.every((e) => e.planned === null)).toBe(true);
  });

  it('consultas por lote con los ids de las series', async () => {
    mockRepo.findSetsForSessions.mockResolvedValueOnce([
      set('a', S1, { exercise_id: 'e-2', original_exercise_id: 'e-1', routine_exercise_id: 're-1' }),
      set('b', S1, { exercise_id: 'e-2', routine_exercise_id: 're-1' }),
    ]);
    await service.getSessionDetail(USER, STUDENT_ID, S1);
    expect(mockRepo.findSetsForSessions).toHaveBeenCalledWith([S1]);
    expect(mockRepo.findExercisesByIds).toHaveBeenCalledTimes(1);
    expect(mockRepo.findExercisesByIds).toHaveBeenCalledWith(expect.arrayContaining(['e-1', 'e-2']));
    expect(mockRepo.findRoutineExercisesByIds).toHaveBeenCalledTimes(1);
    expect(mockRepo.findRoutineExercisesByIds).toHaveBeenCalledWith(['re-1']);
  });

  it('sin series: exercises vacío y sin consultas de ejercicios', async () => {
    const d = await service.getSessionDetail(USER, STUDENT_ID, S1);
    expect(d.exercises).toEqual([]);
    expect(mockRepo.findExercisesByIds).not.toHaveBeenCalled();
    expect(mockRepo.findRoutineExercisesByIds).not.toHaveBeenCalled();
  });
});
