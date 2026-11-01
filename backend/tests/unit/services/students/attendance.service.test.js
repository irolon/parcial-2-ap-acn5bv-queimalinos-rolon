import { jest } from '@jest/globals';

const mockStudentsRepo = { findStudentById: jest.fn(), findFinishedSessionsBetween: jest.fn(), findActiveRoutineSchedules: jest.fn() };
const mockHistoryRepo = { fetchSessionRecords: jest.fn() };
jest.unstable_mockModule('../../../../src/repositories/students/students.repository.js', () => mockStudentsRepo);
jest.unstable_mockModule('../../../../src/repositories/sessions/session-history.repository.js', () => mockHistoryRepo);

const { attendance } = await import('../../../../src/services/students/attendance.service.js');
const { scheduleOf } = await import('../../../../src/models/students/adherence.js');

const STUDENT = { id: 'student-1', trainer_id: 'trainer-1', name: 'Ana', active: true, created_at: '2026-01-10T12:00:00Z' };
const MWF = (since) => new Map([['student-1', scheduleOf([{ days: ['monday', 'wednesday', 'friday'], since }])]]);
const TRAINER = { id: 'trainer-1', role: 'trainer' };

beforeEach(() => {
  jest.clearAllMocks();
  // Hoy: miércoles 2026-11-04 a las 13 en Argentina.
  jest.useFakeTimers({ now: new Date('2026-11-04T16:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
  mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(MWF('2026-01-10'));
  mockStudentsRepo.findFinishedSessionsBetween.mockResolvedValue([]);
  mockHistoryRepo.fetchSessionRecords.mockResolvedValue([]);
});

afterEach(() => jest.useRealTimers());

describe('attendance.service', () => {
  it('pide las sesiones del mes en hora argentina y arma la asistencia', async () => {
    mockStudentsRepo.findFinishedSessionsBetween.mockResolvedValue([
      // 02/11 23:30 en Argentina = 03/11 02:30Z: cuenta para el lunes 2.
      { id: 's1', started_at: '2026-11-03T02:30:00Z' },
    ]);
    mockHistoryRepo.fetchSessionRecords.mockResolvedValue([{ session_id: 's1', exercise_id: 'e1' }, { session_id: 's1', exercise_id: 'e2' }]);

    const r = await attendance(TRAINER, 'student-1', '2026-11');

    expect(mockStudentsRepo.findFinishedSessionsBetween).toHaveBeenCalledWith(
      'student-1',
      '2026-11-01T00:00:00-03:00',
      '2026-12-01T00:00:00-03:00'
    );
    expect(mockHistoryRepo.fetchSessionRecords).toHaveBeenCalledWith('student-1', ['s1']);
    expect(r).toMatchObject({ month: '2026-11', sessions: 1, assigned_days: 2, prs: 1 });
    expect(r.days.find((d) => d.date === '2026-11-02').status).toBe('trained');
    expect(r.days.find((d) => d.date === '2026-11-04').status).toBe('upcoming');
  });

  it('los días anteriores al alta son rest y no suman a assigned_days (alta a mitad de mes)', async () => {
    // Alta el 25/10 con L/X/V: en octubre solo cuentan el 26 (lun), 28 (mié) y 30 (vie).
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT, created_at: '2026-10-25T15:00:00Z' });
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(MWF('2026-10-25'));
    const r = await attendance(TRAINER, 'student-1', '2026-10');
    expect(mockStudentsRepo.findActiveRoutineSchedules).toHaveBeenCalledWith(['student-1']);
    expect(r.assigned_days).toBe(3);
    expect(r.days.find((d) => d.date === '2026-10-05').status).toBe('rest');
    expect(r.days.find((d) => d.date === '2026-10-26').status).toBe('missed');
  });

  it('un mes entero antes del alta queda todo en rest', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT, created_at: '2026-10-25T15:00:00Z' });
    const r = await attendance(TRAINER, 'student-1', '2026-09');
    expect(r.assigned_days).toBe(0);
    expect(r.days.every((d) => d.status === 'rest')).toBe(true);
  });

  it('sin sesiones no consulta los récords', async () => {
    await attendance(TRAINER, 'student-1', '2026-10');
    expect(mockHistoryRepo.fetchSessionRecords).not.toHaveBeenCalled();
  });

  it('el propio alumno puede pedir la suya', async () => {
    await expect(attendance({ id: 'student-1', role: 'student' }, 'student-1', '2026-11')).resolves.toMatchObject({ month: '2026-11' });
  });

  it('alumno de otro trainer → 403 como la ficha, sin consultar sesiones', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue({ ...STUDENT, trainer_id: 'otro' });
    await expect(attendance(TRAINER, 'student-1', '2026-11')).rejects.toMatchObject({ statusCode: 403 });
    expect(mockStudentsRepo.findFinishedSessionsBetween).not.toHaveBeenCalled();
  });
});
