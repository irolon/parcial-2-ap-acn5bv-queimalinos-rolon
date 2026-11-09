import {
  mockStudentsRepo,
  mockAuthRepo,
  mockRoutinesRepo,
  mockBodyMetricsService,
  mockAppointmentsService,
  service,
  STUDENT_ROW,
} from '../../../../../helpers/students/students-service.setup.js';

const SELF = { id: 'student-1', role: 'student' };
const ONLY_SELF = 'Solo podés cambiar tu nombre, teléfono y foto';

describe('students.service — update (el propio alumno, GX2)', () => {
  beforeEach(() => {
    mockBodyMetricsService.latestForStudent.mockResolvedValue(null);
    mockRoutinesRepo.findActiveRoutineSummary.mockResolvedValue(null);
    mockStudentsRepo.findLastSessionDates.mockReset();
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT_ROW);
  });

  it('cambia su nombre y teléfono y devuelve la ficha', async () => {
    const fields = { name: 'Ana Pérez', phone: '1122334455' };
    mockStudentsRepo.updateStudent.mockResolvedValue({ ...STUDENT_ROW, ...fields });

    const detail = await service.update(SELF, 'student-1', fields);

    expect(mockStudentsRepo.updateStudent).toHaveBeenCalledWith('student-1', fields);
    expect(detail).toMatchObject({ id: 'student-1', name: 'Ana Pérez', phone: '1122334455', active_routine: null });
  });

  it('con goal → 403 con el mensaje y no guarda', async () => {
    await expect(service.update(SELF, 'student-1', { goal: 'strength' })).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: ONLY_SELF,
    });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });

  it('con { name, active: false } → 403 ANTES de revocar, guardar o cancelar (Review Focus 1)', async () => {
    await expect(service.update(SELF, 'student-1', { name: 'Ana', active: false })).rejects.toMatchObject({
      statusCode: 403,
      message: ONLY_SELF,
    });
    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
    expect(mockAppointmentsService.cancelFutureForStudent).not.toHaveBeenCalled();
  });

  it('sobre otro alumno → 403 y no toca la base', async () => {
    await expect(service.update(SELF, 'student-2', { name: 'Ana' })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockStudentsRepo.updateStudent).not.toHaveBeenCalled();
  });
});
