import {
  mockStudentsRepo,
  mockRoutinesRepo,
  mockBodyMetricsService,
  service,
  TRAINER,
  STUDENT_ROW,
  LATEST,
  ROUTINE,
} from '../../../../helpers/students/students-service.setup.js';

describe('students.service — getById', () => {
  it('devuelve la ficha con latest_metrics y active_routine', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockBodyMetricsService.latestForStudent.mockResolvedValue(LATEST);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(ROUTINE);

    const detail = await service.getById(TRAINER, 'student-1');

    expect(detail).toEqual({ ...STUDENT_ROW, latest_metrics: LATEST, active_routine: ROUTINE });
    expect(mockBodyMetricsService.latestForStudent).toHaveBeenCalledWith('student-1');
  });

  it('sin medidas ni rutina devuelve null en los dos', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockBodyMetricsService.latestForStudent.mockResolvedValue(null);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(null);

    const detail = await service.getById({ id: 'student-1', role: 'student' }, 'student-1');
    expect(detail.latest_metrics).toBeNull();
    expect(detail.active_routine).toBeNull();
  });

  it('el alumno de otro trainer → 403', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    await expect(
      service.getById({ id: 'trainer-2', role: 'trainer' }, 'student-1')
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
