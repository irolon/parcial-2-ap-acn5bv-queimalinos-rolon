import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  mockCredentialsRepo,
  mockAuthRepo,
  mockPushTokensRepo,
  mockStudentAccess,
  passwordService,
  verifyPassword,
} from '../../../../helpers/auth/password-service.setup.js';

const { Errors } = await import('../../../../../src/shared/utils/errors.js');
const { TEMP_PASSWORD_ALPHABET } = await import('../../../../../src/shared/utils/password.js');

const TRAINER = { id: 'tr-1', role: 'trainer', email: 'pt@fittrainer.app' };
const STUDENT_ROW = { id: 'stu-1', trainer_id: 'tr-1', active: true };

beforeEach(() => {
  mockStudentAccess.assertCanAccessStudent.mockResolvedValue(STUDENT_ROW);
  mockCredentialsRepo.setPassword.mockResolvedValue({ password_changed_at: 'x' });
});

describe('password.service · resetStudentPassword (POST /students/:id/password-reset)', () => {
  it('alumno de otro PT o inexistente → el 403 de assertCanAccessStudent, nada tocado', async () => {
    mockStudentAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden());
    await expect(passwordService.resetStudentPassword(TRAINER, 'stu-9')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockStudentAccess.assertCanAccessStudent).toHaveBeenCalledWith(TRAINER, 'stu-9');
    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it('un alumno (aunque sea él mismo) → 403', async () => {
    const self = { id: 'stu-1', role: 'student', email: 'a@x.com' };
    await expect(passwordService.resetStudentPassword(self, 'stu-1')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it('alumno inactivo → 409 STUDENT_INACTIVE, nada revocado', async () => {
    mockStudentAccess.assertCanAccessStudent.mockResolvedValue({ ...STUDENT_ROW, active: false });
    await expect(passwordService.resetStudentPassword(TRAINER, 'stu-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'STUDENT_INACTIVE',
    });
    expect(mockAuthRepo.revokeAllForUser).not.toHaveBeenCalled();
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it('revoca las sesiones ANTES de guardar la clave (mismo criterio que la baja)', async () => {
    await passwordService.resetStudentPassword(TRAINER, 'stu-1');
    expect(mockAuthRepo.revokeAllForUser).toHaveBeenCalledWith('stu-1', 'student');
    const revokedAt = mockAuthRepo.revokeAllForUser.mock.invocationCallOrder[0];
    const savedAt = mockCredentialsRepo.setPassword.mock.invocationCallOrder[0];
    expect(revokedAt).toBeLessThan(savedAt);
  });

  it('guarda solo el hash con el flag prendido y borra todos sus push tokens', async () => {
    const { temporary_password } = await passwordService.resetStudentPassword(TRAINER, 'stu-1');

    const [id, role, { hash, mustChange }] = mockCredentialsRepo.setPassword.mock.calls[0];
    expect([id, role, mustChange]).toEqual(['stu-1', 'student', true]);
    expect(hash).not.toBe(temporary_password);
    await expect(verifyPassword(temporary_password, hash)).resolves.toBe(true);
    expect(mockPushTokensRepo.deleteAllForUserExcept).toHaveBeenCalledWith({
      id: 'stu-1',
      role: 'student',
    });
    expect(mockPushTokensRepo.deleteAllForUserExcept.mock.calls[0]).toHaveLength(1);
  });

  it('la temporal cumple el formato (10 caracteres del alfabeto, mayúscula y número)', async () => {
    const { temporary_password } = await passwordService.resetStudentPassword(TRAINER, 'stu-1');
    expect(temporary_password).toHaveLength(10);
    for (const char of temporary_password) expect(TEMP_PASSWORD_ALPHABET).toContain(char);
    expect(temporary_password).toMatch(/[A-Z]/);
    expect(temporary_password).toMatch(/[0-9]/);
  });
});
