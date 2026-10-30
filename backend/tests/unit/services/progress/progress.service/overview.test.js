import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockProgressRepo, mockAccess, service, TRAINER, STUDENT, STUDENT_ROW, EXERCISE_ID,
  EXERCISE_ROWS, WEEK_ROWS,
} from '../../../../helpers/progress/progress-service.setup.js';
import { Errors } from '../../../../../src/shared/utils/errors.js';

beforeEach(() => {
  jest.resetAllMocks();
  mockAccess.assertCanAccessStudent.mockResolvedValue(STUDENT_ROW);
  mockProgressRepo.fetchProgressExercises.mockResolvedValue(EXERCISE_ROWS);
  mockProgressRepo.fetchWeeklyVolume.mockResolvedValue(WEEK_ROWS);
});

describe('progress.service · overview · permisos', () => {
  it('alumno sin student_id usa su propio id y pasa from/to null', async () => {
    await service.overview(STUDENT, {});
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(STUDENT, STUDENT.id);
    expect(mockProgressRepo.fetchProgressExercises).toHaveBeenCalledWith(STUDENT.id);
    expect(mockProgressRepo.fetchWeeklyVolume)
      .toHaveBeenCalledWith({ studentId: STUDENT.id, from: null, to: null });
  });

  it('alumno con student_id ajeno: 403 y no consulta datos', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValueOnce(Errors.forbidden());
    await expect(service.overview(STUDENT, { student_id: 'otro' }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(mockProgressRepo.fetchProgressExercises).not.toHaveBeenCalled();
    expect(mockProgressRepo.fetchWeeklyVolume).not.toHaveBeenCalled();
  });

  it('entrenador sin student_id: 400 VALIDATION_ERROR en student_id', async () => {
    await expect(service.overview(TRAINER, {})).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [expect.objectContaining({ field: 'student_id' })],
    });
    expect(mockAccess.assertCanAccessStudent).not.toHaveBeenCalled();
  });

  it('entrenador con alumno de otro entrenador: 403', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValueOnce(Errors.forbidden());
    await expect(service.overview(TRAINER, { student_id: STUDENT.id }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(mockProgressRepo.fetchWeeklyVolume).not.toHaveBeenCalled();
  });
});

describe('progress.service · overview · respuesta', () => {
  it('entrenador con alumno suyo: pasa las fechas al repo y devuelve el overview', async () => {
    const result = await service.overview(TRAINER, {
      student_id: STUDENT.id, from: '2026-10-01', to: '2026-10-31',
    });
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(TRAINER, STUDENT.id);
    expect(mockProgressRepo.fetchWeeklyVolume).toHaveBeenCalledWith({
      studentId: STUDENT.id, from: '2026-10-01', to: '2026-10-31',
    });
    expect(result).toEqual({
      exercises: [{
        id: EXERCISE_ID, name: 'Press de banca', muscle_group: 'chest', days: 18, last_date: '2026-10-27',
      }],
      weekly_volume: [
        { week_start: '2026-10-20', volume_kg: 5230.5, sessions: 3 },
        { week_start: '2026-10-27', volume_kg: 0, sessions: 0 },
      ],
    });
  });

  it('sin datos devuelve listas vacías', async () => {
    mockProgressRepo.fetchProgressExercises.mockResolvedValueOnce([]);
    mockProgressRepo.fetchWeeklyVolume.mockResolvedValueOnce([]);
    expect(await service.overview(STUDENT, {})).toEqual({ exercises: [], weekly_volume: [] });
  });
});
