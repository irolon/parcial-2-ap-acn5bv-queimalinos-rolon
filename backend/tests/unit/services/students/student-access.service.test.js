import { jest } from '@jest/globals';

const mockStudentsRepo = { findStudentById: jest.fn() };
jest.unstable_mockModule(
  '../../../../src/repositories/students/students.repository.js',
  () => mockStudentsRepo
);

const { assertCanAccessStudent } = await import(
  '../../../../src/services/students/student-access.service.js'
);

const STUDENT = { id: 'student-1', trainer_id: 'trainer-1', name: 'Ana', active: true };
const forbidden = expect.objectContaining({ code: 'FORBIDDEN', statusCode: 403 });

describe('student-access.service — assertCanAccessStudent', () => {
  it('el trainer dueño accede y recibe la fila del alumno', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'trainer-1', role: 'trainer' }, 'student-1')
    ).resolves.toEqual(STUDENT);
  });

  it('el propio alumno accede', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'student-1', role: 'student' }, 'student-1')
    ).resolves.toEqual(STUDENT);
  });

  it('otro trainer → 403', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'trainer-2', role: 'trainer' }, 'student-1')
    ).rejects.toEqual(forbidden);
  });

  it('otro alumno → 403 sin consultar la base', async () => {
    await expect(
      assertCanAccessStudent({ id: 'student-2', role: 'student' }, 'student-1')
    ).rejects.toEqual(forbidden);
    expect(mockStudentsRepo.findStudentById).not.toHaveBeenCalled();
  });

  it('alumno inexistente → 403 (no revela qué ids existen)', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(null);
    await expect(
      assertCanAccessStudent({ id: 'trainer-1', role: 'trainer' }, 'student-x')
    ).rejects.toEqual(forbidden);
  });

  it('un rol desconocido → 403', async () => {
    mockStudentsRepo.findStudentById.mockResolvedValue(STUDENT);
    await expect(
      assertCanAccessStudent({ id: 'x', role: 'admin' }, 'student-1')
    ).rejects.toEqual(forbidden);
  });
});
