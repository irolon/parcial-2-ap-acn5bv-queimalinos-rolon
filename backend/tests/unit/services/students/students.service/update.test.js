import {
  mockStudentsRepo,
  mockAuthRepo,
  mockRoutinesRepo,
  mockBodyMetricsService,
  mockAppointmentsService,
  service,
  TRAINER,
  STUDENT_ROW,
} from '../../../../helpers/students/students-service.setup.js';

describe('students.service — update', () => {
  beforeEach(() => {
    mockBodyMetricsService.latestForStudent.mockResolvedValue(null);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(null);
    mockStudentsRepo.findLastSessionDates.mockReset();
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([
      { student_id: 'student-1', last_session_at: '2026-10-20T10:00:00Z' },
    ]);
  });

  it('actualiza y devuelve la ficha completa', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, level: 'advanced' });

    const detail = await service.update(TRAINER, 'student-1', { level: 'advanced' });

    expect(mockStudentsRepo.updateStudent).toHaveBeenCalledWith('student-1', { level: 'advanced' });
    expect(detail).toMatchObject({
      level: 'advanced',
      latest_metrics: null,
      active_routine: null,
      last_session_at: '2026-10-20T10:00:00Z',
    });
    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
    expect(mockAppointmentsService.cancelFutureForStudent).not.toHaveBeenCalled();
  });

  it('dar de baja a un alumno activo revoca sus sesiones y cancela sus turnos futuros', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });

    await service.update(TRAINER, 'student-1', { active: false });

    expect(mockAuthRepo.revokeAllForUser).toHaveBeenCalledWith('student-1', 'student');
    expect(mockAppointmentsService.cancelFutureForStudent).toHaveBeenCalledWith('student-1');
  });

  it('guarda la baja ANTES de cancelar los turnos (cancelar no tiene vuelta atrás)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });

    await service.update(TRAINER, 'student-1', { active: false });

    const saved = mockStudentsRepo.updateStudent.mock.invocationCallOrder[0];
    expect(mockAppointmentsService.cancelFutureForStudent.mock.invocationCallOrder[0]).toBeGreaterThan(saved);
  });

  it('si guardar la baja falla, no cancela ningún turno (el alumno sigue activo con sus turnos)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockRejectedValueOnce(new Error('db'));

    await expect(service.update(TRAINER, 'student-1', { active: false })).rejects.toThrow('db');
    expect(mockAppointmentsService.cancelFutureForStudent).not.toHaveBeenCalled();
  });

  it('si cancelar los turnos falla, el error sale y repetir la baja los vuelve a cancelar', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });
    mockAppointmentsService.cancelFutureForStudent.mockRejectedValueOnce(new Error('db'));

    await expect(service.update(TRAINER, 'student-1', { active: false })).rejects.toThrow('db');
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT_ROW, active: false });
    await service.update(TRAINER, 'student-1', { active: false });
    expect(mockAppointmentsService.cancelFutureForStudent).toHaveBeenCalledTimes(2);
  });

  it('repetir la baja vuelve a revocar (permite reintentar si falló antes)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT_ROW, active: false });
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });

    await service.update(TRAINER, 'student-1', { active: false });

    expect(mockAuthRepo.revokeAllForUser).toHaveBeenCalledWith('student-1', 'student');
  });

  it('si la revocación falla, no guarda la baja (el reintento la completa)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    mockAuthRepo.revokeAllForUser.mockRejectedValueOnce(new Error('la base se cayó'));

    await expect(service.update(TRAINER, 'student-1', { active: false })).rejects.toThrow(
      'la base se cayó'
    );
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });

  it('reactivar no revoca nada', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT_ROW, active: false });
    mockStudentsRepo.updateStudent.mockResolvedValue(STUDENT_ROW);

    await service.update(TRAINER, 'student-1', { active: true });

    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
    expect(mockAppointmentsService.cancelFutureForStudent).not.toHaveBeenCalled();
  });

  it('el propio alumno no puede editarse → 403 y no toca la base', async () => {
    await expect(
      service.update({ id: 'student-1', role: 'student' }, 'student-1', { level: 'advanced' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });

  it('otro trainer → 403 y no toca la base', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
    await expect(
      service.update({ id: 'trainer-2', role: 'trainer' }, 'student-1', { name: 'X' })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });
});
