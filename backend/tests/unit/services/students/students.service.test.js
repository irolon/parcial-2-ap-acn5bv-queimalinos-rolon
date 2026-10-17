import { jest } from '@jest/globals';

// Mocks de las dependencias del service.
const mockInvitationsRepo = {
  findInvitationByToken: jest.fn(),
  claimInvitation: jest.fn(),
  releaseInvitation: jest.fn(),
};
const mockStudentsRepo = {
  createStudent: jest.fn(),
  findStudentsByTrainer: jest.fn(),
};
const mockIssueTokens = jest.fn();

jest.unstable_mockModule(
  '../../../../src/repositories/invitations/invitations.repository.js',
  () => mockInvitationsRepo
);
jest.unstable_mockModule(
  '../../../../src/repositories/students/students.repository.js',
  () => mockStudentsRepo
);
jest.unstable_mockModule('../../../../src/services/auth/auth.service.js', () => ({
  issueTokens: mockIssueTokens,
}));

const service = await import('../../../../src/services/students/students.service.js');

const VALID_INVITATION = {
  id: 'inv-1',
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  student_goal: 'hypertrophy',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  used_at: null,
  trainer: { id: 'trainer-1', name: 'Ignacio' },
};

const CREATED_STUDENT = {
  id: 'student-1',
  trainer_id: 'trainer-1',
  name: 'Pedro Gómez',
  email: 'pedro@mail.com',
  goal: 'hypertrophy',
};

describe('students.service — list', () => {
  it('devuelve data + meta de paginación', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 's1' }], total: 1 });
    const r = await service.list('trainer-1', { page: 1, limit: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.meta).toEqual({ total: 1, page: 1, limit: 20, total_pages: 1 });
  });

  it('aplica defaults de page/limit y pasa el trainer al repo', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    const r = await service.list('trainer-1', {});
    expect(r.meta.page).toBe(1);
    expect(r.meta.limit).toBe(20);
    expect(mockStudentsRepo.findStudentsByTrainer).toHaveBeenCalledWith(
      expect.objectContaining({ trainerId: 'trainer-1', page: 1, limit: 20 })
    );
  });
});

describe('students.service — registerFromInvitation', () => {
  it('crea el alumno, reclama la invitación y devuelve tokens', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(VALID_INVITATION);
    mockInvitationsRepo.claimInvitation.mockResolvedValue(true);
    mockStudentsRepo.createStudent.mockResolvedValue(CREATED_STUDENT);
    mockIssueTokens.mockResolvedValue({ token: 'access', refresh_token: 'refresh' });

    const result = await service.registerFromInvitation({ token: 'tok', password: 'Password1' });

    expect(result).toEqual({
      student: CREATED_STUDENT,
      token: 'access',
      refresh_token: 'refresh',
    });

    // El alumno se crea con los datos de la invitación + el trainer dueño.
    const createArg = mockStudentsRepo.createStudent.mock.calls[0][0];
    expect(createArg.trainerId).toBe('trainer-1');
    expect(createArg.email).toBe('pedro@mail.com');
    expect(createArg.passwordHash).toBeDefined();
    expect(createArg.passwordHash).not.toBe('Password1'); // hasheada

    // Se reclama la invitación y se emiten tokens con rol student.
    expect(mockInvitationsRepo.claimInvitation).toHaveBeenCalledWith('inv-1');
    expect(mockIssueTokens).toHaveBeenCalledWith(CREATED_STUDENT, 'student');
  });

  it('lanza INVITATION_NOT_FOUND si el token no existe', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(null);
    await expect(
      service.registerFromInvitation({ token: 'x', password: 'Password1' })
    ).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND', statusCode: 404 });
    expect(mockStudentsRepo.createStudent).not.toHaveBeenCalled();
  });

  it('lanza INVITATION_ALREADY_USED si ya fue usada', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue({
      ...VALID_INVITATION,
      used_at: '2026-06-20T00:00:00Z',
    });
    await expect(
      service.registerFromInvitation({ token: 'x', password: 'Password1' })
    ).rejects.toMatchObject({ code: 'INVITATION_ALREADY_USED', statusCode: 410 });
    expect(mockStudentsRepo.createStudent).not.toHaveBeenCalled();
  });

  it('lanza INVITATION_EXPIRED si venció', async () => {
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue({
      ...VALID_INVITATION,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    await expect(
      service.registerFromInvitation({ token: 'x', password: 'Password1' })
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED', statusCode: 410 });
  });
it('con dos registros simultáneos del mismo token crea un solo alumno', async () => {
    // Las dos requests leen la invitación antes de que ninguna la marque:
    // esa es exactamente la ventana de la condición de carrera (doble submit
    // del alumno cuando el wifi está lento).
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(VALID_INVITATION);

    // Simula el UPDATE ... WHERE used_at IS NULL de Postgres: la gana una sola.
    let reclamada = false;
    mockInvitationsRepo.claimInvitation.mockImplementation(async () => {
      if (reclamada) return false;
      reclamada = true;
      return true;
    });

    mockStudentsRepo.createStudent.mockResolvedValue(CREATED_STUDENT);
    mockIssueTokens.mockResolvedValue({ token: 'access', refresh_token: 'refresh' });

    const resultados = await Promise.allSettled([
      service.registerFromInvitation({ token: 'tok', password: 'Password1' }),
      service.registerFromInvitation({ token: 'tok', password: 'Password1' }),
    ]);

    const cumplidas = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadas = resultados.filter((r) => r.status === 'rejected');

    expect(cumplidas).toHaveLength(1);
    expect(rechazadas).toHaveLength(1);
    expect(rechazadas[0].reason).toMatchObject({ code: 'INVITATION_ALREADY_USED' });

    // Lo que importa: un solo alumno en la base.
    expect(mockStudentsRepo.createStudent).toHaveBeenCalledTimes(1);
  });

  it('libera la invitación si falla la creación del alumno', async () => {
    // Reclamar antes de crear evita alumnos duplicados, pero si la creación
    // falla la invitación no puede quedar quemada: el alumno no podría
    // registrarse nunca más y el PT tendría que emitir otra.
    mockInvitationsRepo.findInvitationByToken.mockResolvedValue(VALID_INVITATION);
    mockInvitationsRepo.claimInvitation.mockResolvedValue(true);
    mockStudentsRepo.createStudent.mockRejectedValue(new Error('la base se cayó'));

    await expect(
      service.registerFromInvitation({ token: 'tok', password: 'Password1' })
    ).rejects.toThrow('la base se cayó');

    expect(mockInvitationsRepo.releaseInvitation).toHaveBeenCalledWith('inv-1');
  });
});
