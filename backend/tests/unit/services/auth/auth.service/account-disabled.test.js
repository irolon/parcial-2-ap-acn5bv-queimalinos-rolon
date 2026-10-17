import {
  mockRepo,
  mockStudentsRepo,
  authService,
  hashPassword,
  verifyAccessToken,
} from '../../../../helpers/auth/auth-service.setup.js';

describe('auth.service', () => {
  describe('alumno dado de baja (active = false)', () => {
    const studentRow = async (active) => ({
      id: 'student-1',
      trainer_id: 'trainer-1',
      name: 'Alumna',
      email: 'alumna@mail.com',
      active,
      password_hash: await hashPassword('Password1'),
    });

    it('login con la contraseña correcta → ACCOUNT_DISABLED y no emite tokens', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(false));

      await expect(
        authService.login({ email: 'alumna@mail.com', password: 'Password1' })
      ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED', statusCode: 401 });
      expect(mockRepo.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('login con la contraseña incorrecta → INVALID_CREDENTIALS (no revela la baja)', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(false));

      await expect(
        authService.login({ email: 'alumna@mail.com', password: 'Otra12345' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('login de una alumna reactivada (active = true) funciona', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(await studentRow(true));

      const result = await authService.login({ email: 'alumna@mail.com', password: 'Password1' });
      expect(result.user.role).toBe('student');
      expect(typeof result.token).toBe('string');
    });

    const storedToken = (role) => ({
      id: 'rt-1',
      user_id: role === 'student' ? 'student-1' : 'trainer-1',
      role,
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      revoked_at: null,
    });

    it('refresh de un alumno inactivo → ACCOUNT_DISABLED', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(storedToken('student'));
      mockStudentsRepo.findStudentById.mockResolvedValue({ id: 'student-1', active: false });

      await expect(authService.refresh({ refresh_token: 'tok' })).rejects.toMatchObject({
        code: 'ACCOUNT_DISABLED',
        statusCode: 401,
      });
    });

    it('refresh de un alumno activo emite un access token', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(storedToken('student'));
      mockStudentsRepo.findStudentById.mockResolvedValue({ id: 'student-1', active: true });

      const result = await authService.refresh({ refresh_token: 'tok' });
      expect(verifyAccessToken(result.token).sub).toBe('student-1');
    });

    it('refresh de un trainer no consulta students', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(storedToken('trainer'));

      await authService.refresh({ refresh_token: 'tok' });
      expect(mockStudentsRepo.findStudentById).not.toHaveBeenCalled();
    });
  });
});
