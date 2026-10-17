import {
  mockRepo,
  mockStudentsRepo,
  authService,
  hashPassword,
  verifyAccessToken,
  TRAINER,
} from '../../../../helpers/auth/auth-service.setup.js';

describe('auth.service', () => {
  describe('register', () => {
    it('hashea la contraseña, crea el trainer y devuelve tokens', async () => {
      mockRepo.createTrainer.mockResolvedValue(TRAINER);

      const result = await authService.register({
        name: 'Ignacio Rolon',
        email: 'ignacio@fittrainer.app',
        password: 'Password1',
        specialty: 'Fuerza',
      });

      // La contraseña que llega al repo NO es texto plano.
      const passedHash = mockRepo.createTrainer.mock.calls[0][0].passwordHash;
      expect(passedHash).toBeDefined();
      expect(passedHash).not.toBe('Password1');

      expect(result.trainer).toEqual(TRAINER);
      expect(typeof result.token).toBe('string');
      expect(typeof result.refresh_token).toBe('string');

      // El access token es un JWT válido con el id y rol correctos.
      const decoded = verifyAccessToken(result.token);
      expect(decoded.sub).toBe(TRAINER.id);
      expect(decoded.role).toBe('trainer');

      // Se persistió el refresh token (su hash).
      expect(mockRepo.saveRefreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('devuelve user + tokens cuando las credenciales son correctas', async () => {
      const password_hash = await hashPassword('Password1');
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue({ ...TRAINER, password_hash });

      const result = await authService.login({
        email: 'ignacio@fittrainer.app',
        password: 'Password1',
      });

      expect(result.user.role).toBe('trainer');
      expect(result.user.password_hash).toBeUndefined(); // nunca se filtra el hash
      expect(typeof result.token).toBe('string');
      expect(typeof result.refresh_token).toBe('string');
    });

    it('lanza INVALID_CREDENTIALS si el email no existe (ni trainer ni alumno)', async () => {
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue(null);
      await expect(
        authService.login({ email: 'noexiste@x.com', password: 'Password1' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
    });

    it('autentica a un alumno cuando no es trainer pero sí student', async () => {
      const password_hash = await hashPassword('Password1');
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue(null);
      mockStudentsRepo.findStudentByEmailWithHash.mockResolvedValue({
        id: 'student-1',
        name: 'Pedro',
        email: 'pedro@mail.com',
        goal: 'hypertrophy',
        password_hash,
      });

      const result = await authService.login({ email: 'pedro@mail.com', password: 'Password1' });

      expect(result.user.role).toBe('student');
      expect(result.user.password_hash).toBeUndefined();
      expect(typeof result.token).toBe('string');
    });

    it('lanza INVALID_CREDENTIALS si la contraseña es incorrecta', async () => {
      const password_hash = await hashPassword('Password1');
      mockRepo.findTrainerByEmailWithHash.mockResolvedValue({ ...TRAINER, password_hash });
      await expect(
        authService.login({ email: 'ignacio@fittrainer.app', password: 'MalaPass9' })
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });
});
