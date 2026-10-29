import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockProgressRepo, mockRoutinesRepo, mockExercisesRepo, mockAccess, service,
  TRAINER, STUDENT, EXERCISE_ID, EXERCISE, STUDENT_ROW, ROWS,
} from '../../../../helpers/progress/progress-service.setup.js';
import { Errors } from '../../../../../src/shared/utils/errors.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockAccess.assertCanAccessStudent.mockResolvedValue(STUDENT_ROW);
  mockRoutinesRepo.findAccessibleExerciseIds.mockResolvedValue([EXERCISE_ID]);
  mockExercisesRepo.findExerciseById.mockResolvedValue(EXERCISE);
  mockProgressRepo.fetchExerciseProgress.mockResolvedValue(ROWS);
});

describe('progress.service · exerciseProgress · permisos', () => {
  it('alumno sin student_id usa su propio id', async () => {
    await service.exerciseProgress(STUDENT, EXERCISE_ID, {});
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(STUDENT, STUDENT.id);
    expect(mockProgressRepo.fetchExerciseProgress).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: STUDENT.id, exerciseId: EXERCISE_ID })
    );
  });

  it('alumno con student_id de otro: 403 y no consulta nada más', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValueOnce(Errors.forbidden());
    await expect(service.exerciseProgress(STUDENT, EXERCISE_ID, { student_id: 'otro' }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(mockProgressRepo.fetchExerciseProgress).not.toHaveBeenCalled();
  });

  it('entrenador sin student_id: 400 VALIDATION_ERROR en student_id', async () => {
    await expect(service.exerciseProgress(TRAINER, EXERCISE_ID, {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field: 'student_id' })],
    });
    expect(mockAccess.assertCanAccessStudent).not.toHaveBeenCalled();
  });

  it('entrenador con alumno suyo: llama al RPC con ese alumno y las fechas', async () => {
    await service.exerciseProgress(TRAINER, EXERCISE_ID, {
      student_id: STUDENT.id, from: '2026-10-01', to: '2026-10-31',
    });
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(TRAINER, STUDENT.id);
    expect(mockProgressRepo.fetchExerciseProgress).toHaveBeenCalledWith({
      studentId: STUDENT.id, exerciseId: EXERCISE_ID, from: '2026-10-01', to: '2026-10-31',
    });
  });

  it('sin fechas pasa null al RPC', async () => {
    await service.exerciseProgress(STUDENT, EXERCISE_ID, {});
    expect(mockProgressRepo.fetchExerciseProgress).toHaveBeenCalledWith(
      expect.objectContaining({ from: null, to: null })
    );
  });
});

describe('progress.service · exerciseProgress · ejercicio y respuesta', () => {
  it('ejercicio no visible para el entrenador del alumno: 404 y sin RPC', async () => {
    mockRoutinesRepo.findAccessibleExerciseIds.mockResolvedValueOnce([]);
    await expect(service.exerciseProgress(STUDENT, EXERCISE_ID, {}))
      .rejects.toMatchObject({ statusCode: 404, code: 'EXERCISE_NOT_FOUND' });
    expect(mockRoutinesRepo.findAccessibleExerciseIds)
      .toHaveBeenCalledWith([EXERCISE_ID], STUDENT_ROW.trainer_id);
    expect(mockProgressRepo.fetchExerciseProgress).not.toHaveBeenCalled();
  });

  it('devuelve exercise, points del modelo, pr y default_metric', async () => {
    const result = await service.exerciseProgress(STUDENT, EXERCISE_ID, {});
    expect(result.exercise).toEqual({ id: EXERCISE_ID, name: 'Press de banca', muscle_group: 'chest' });
    expect(result.points).toEqual([
      { date: '2026-10-20', max_kg: 60, volume_kg: 1800, e1rm_kg: 72, sets: 3, reps: 30 },
      { date: '2026-10-27', max_kg: 62.5, volume_kg: 1875, e1rm_kg: 79.2, sets: 3, reps: 30 },
    ]);
    expect(result.pr).toEqual({
      max_kg: { value: 62.5, date: '2026-10-27' },
      e1rm_kg: { value: 79.2, date: '2026-10-27' },
    });
    expect(result.default_metric).toBe('e1rm_kg');
  });

  it('sin filas: points vacío y pr con nulls', async () => {
    mockProgressRepo.fetchExerciseProgress.mockResolvedValueOnce([]);
    const result = await service.exerciseProgress(STUDENT, EXERCISE_ID, {});
    expect(result.points).toEqual([]);
    expect(result.pr).toEqual({ max_kg: null, e1rm_kg: null });
  });
});
