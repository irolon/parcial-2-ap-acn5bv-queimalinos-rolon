import {
  mockRepo,
  mockStudentsRepo,
  authService,
  hashPassword,
  verifyAccessToken,
  TRAINER,
} from '../../../../helpers/auth/auth-service.setup.js';

// GX1: login y refresh informan must_change_password y firman el claim, que
// authenticate rechaza con 403 hasta que el alumno elija una clave nueva.
describe('auth.service · must_change_password (GX1)', () => {
  const studentRow = async (mustChange) => ({
    id: 'student-1',
    trainer_id: 'trainer-1',
    name: 'Alumna',
    email: 'alumna@mail.com',
    active: true,
    must_change_password: mustChange,
    password_changed_at: '2026-11-01T10:00:00Z',
    password_hash: await hashPassword('Password1'),
  });

  const storedToken = (role) => ({
    id: 'rt-1',
    user_id: role === 'student' ? 'student-1' : 'trainer-1',
    role,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    revoked_at: null,
  });

  const loginStudent = async (mustChange) => {
    mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
    mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(mustChange));
    return authService.login({ email: 'alumna@mail.com', password: 'Password1' });
  };

  it('login de alumno con la clave blanqueada → user.must_change_password y claim en el token', async () => {
    const result = await loginStudent(true);
    expect(result.user.must_change_password).toBe(true);
    expect(result.user.password_changed_at).toBe('2026-11-01T10:00:00Z');
    expect(verifyAccessToken(result.token).must_change_password).toBe(true);
  });

  it('login de alumno sin el flag → el token no tiene la propiedad', async () => {
    const result = await loginStudent(false);
    expect(result.user.must_change_password).toBe(false);
    expect(verifyAccessToken(result.token)).not.toHaveProperty('must_change_password');
  });

  it('login de trainer → must_change_password false y password_changed_at presente', async () => {
    mockRepo.findTrainerByEmailWithHash.mockResolvedValue({
      ...TRAINER,
      password_changed_at: null,
      password_hash: await hashPassword('Password1'),
    });
    const result = await authService.login({ email: TRAINER.email, password: 'Password1' });
    expect(result.user.must_change_password).toBe(false);
    expect(result.user).toHaveProperty('password_changed_at', null);
    expect(verifyAccessToken(result.token)).not.toHaveProperty('must_change_password');
  });

  it('refresh de alumno con el flag → cuerpo con must_change_password y claim en el token', async () => {
    mockRepo.findRefreshToken.mockResolvedValue(storedToken('student'));
    mockStudentsRepo.findStudentById.mockResolvedValue({
      id: 'student-1',
      active: true,
      must_change_password: true,
    });
    const result = await authService.refresh({ refresh_token: 'tok' });
    expect(result.must_change_password).toBe(true);
    expect(verifyAccessToken(result.token).must_change_password).toBe(true);
  });

  it('refresh de alumno sin el flag → false y sin claim', async () => {
    mockRepo.findRefreshToken.mockResolvedValue(storedToken('student'));
    mockStudentsRepo.findStudentById.mockResolvedValue({
      id: 'student-1',
      active: true,
      must_change_password: false,
    });
    const result = await authService.refresh({ refresh_token: 'tok' });
    expect(result.must_change_password).toBe(false);
    expect(verifyAccessToken(result.token)).not.toHaveProperty('must_change_password');
  });

  it('refresh de trainer → must_change_password false sin claim', async () => {
    mockRepo.findRefreshToken.mockResolvedValue(storedToken('trainer'));
    const result = await authService.refresh({ refresh_token: 'tok' });
    expect(result.must_change_password).toBe(false);
    expect(verifyAccessToken(result.token)).not.toHaveProperty('must_change_password');
  });
});
