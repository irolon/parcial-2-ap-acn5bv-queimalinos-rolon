import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  mockCredentialsRepo,
  mockAuthRepo,
  mockPushTokensRepo,
  passwordService,
  hashPassword,
  verifyPassword,
  verifyAccessToken,
  hashToken,
  storedRefresh,
} from '../../../../helpers/auth/password-service.setup.js';

const USER = { id: 'stu-1', role: 'student', email: 'ana@fittrainer.app' };
const BODY = {
  current_password: 'Temporal23',
  new_password: 'NuevaClave9',
  refresh_token: 'rt-propio',
  push_token: 'fcm:propio',
};

/** Espera un VALIDATION_ERROR con un solo detalle en `field`. */
async function expectFieldError(promise, field) {
  const err = await promise.catch((e) => e);
  expect(err).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  expect(err.details[0].field).toBe(field);
  return err;
}

beforeEach(async () => {
  mockCredentialsRepo.findPasswordHash.mockResolvedValue(await hashPassword('Temporal23'));
  mockCredentialsRepo.setPassword.mockResolvedValue({
    password_changed_at: '2026-11-09T15:00:00Z',
  });
  mockAuthRepo.findRefreshToken.mockResolvedValue(storedRefresh('stu-1', 'student'));
});

describe('password.service · changePassword (PUT /auth/password)', () => {
  it('clave actual incorrecta → 400 en current_password (no 401) y no guarda nada', async () => {
    await expectFieldError(
      passwordService.changePassword(USER, { ...BODY, current_password: 'Otra12345' }),
      'current_password'
    );
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it('nueva igual a la actual → 400 en new_password', async () => {
    const err = await expectFieldError(
      passwordService.changePassword(USER, { ...BODY, new_password: 'Temporal23' }),
      'new_password'
    );
    expect(err.details[0].message).toBe('La nueva contraseña tiene que ser distinta de la actual');
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it.each([
    ['revocado, vencido o inexistente', null],
    ['de otro usuario', storedRefresh('stu-2', 'student')],
    ['del mismo id con otro rol', storedRefresh('stu-1', 'trainer')],
    [
      'vencido pero sin revocar',
      { ...storedRefresh('stu-1', 'student'), expires_at: '2020-01-01T00:00:00Z' },
    ],
  ])('refresh_token %s → 400 en refresh_token sin cambiar la clave', async (_caso, stored) => {
    mockAuthRepo.findRefreshToken.mockResolvedValue(stored);
    await expectFieldError(passwordService.changePassword(USER, BODY), 'refresh_token');
    expect(mockAuthRepo.findRefreshToken).toHaveBeenCalledWith(hashToken('rt-propio'));
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it('ok → guarda el hash nuevo con el flag apagado, revoca los otros y borra los push ajenos', async () => {
    const result = await passwordService.changePassword(USER, BODY);

    const [id, role, { hash, mustChange }] = mockCredentialsRepo.setPassword.mock.calls[0];
    expect([id, role, mustChange]).toEqual(['stu-1', 'student', false]);
    expect(hash).not.toBe('NuevaClave9');
    await expect(verifyPassword('NuevaClave9', hash)).resolves.toBe(true);

    expect(mockAuthRepo.revokeAllForUserExcept).toHaveBeenCalledWith(
      'stu-1',
      'student',
      hashToken('rt-propio')
    );
    expect(mockPushTokensRepo.deleteAllForUserExcept).toHaveBeenCalledWith(
      { id: 'stu-1', role: 'student' },
      'fcm:propio'
    );

    expect(result.password_changed_at).toBe('2026-11-09T15:00:00Z');
    expect(result.expires_in).toBeDefined();
    const payload = verifyAccessToken(result.token);
    expect(payload).toMatchObject({ sub: 'stu-1', role: 'student', email: 'ana@fittrainer.app' });
    expect(payload).not.toHaveProperty('must_change_password');
  });

  it.each([
    ['la revocación de las otras sesiones', () => mockAuthRepo.revokeAllForUserExcept],
    ['el borrado de los push ajenos', () => mockPushTokensRepo.deleteAllForUserExcept],
  ])('si falla %s no toca la clave (el reintento sigue aceptando la actual)', async (_c, fn) => {
    fn().mockRejectedValueOnce(new Error('db caída'));
    await expect(passwordService.changePassword(USER, BODY)).rejects.toThrow('db caída');
    expect(mockCredentialsRepo.setPassword).not.toHaveBeenCalled();
  });

  it('revoca sesiones y push ANTES de guardar la clave nueva', async () => {
    await passwordService.changePassword(USER, BODY);
    const savedAt = mockCredentialsRepo.setPassword.mock.invocationCallOrder[0];
    expect(mockAuthRepo.revokeAllForUserExcept.mock.invocationCallOrder[0]).toBeLessThan(savedAt);
    expect(mockPushTokensRepo.deleteAllForUserExcept.mock.invocationCallOrder[0]).toBeLessThan(
      savedAt
    );
  });

  it('sin push_token borra todos los push del usuario (la web no tiene)', async () => {
    const { push_token: _omit, ...body } = BODY;
    mockAuthRepo.findRefreshToken.mockResolvedValue(storedRefresh('t-1', 'trainer'));
    await passwordService.changePassword({ id: 't-1', role: 'trainer', email: 't@x.com' }, body);
    expect(mockCredentialsRepo.findPasswordHash).toHaveBeenCalledWith('t-1', 'trainer');
    expect(mockPushTokensRepo.deleteAllForUserExcept).toHaveBeenCalledWith(
      { id: 't-1', role: 'trainer' },
      undefined
    );
  });
});
