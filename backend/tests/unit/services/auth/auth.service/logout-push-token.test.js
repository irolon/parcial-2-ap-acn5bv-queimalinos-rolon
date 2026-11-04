import { jest } from '@jest/globals';
import {
  mockRepo,
  mockPushTokensRepo,
  authService,
  hashToken,
  TRAINER,
} from '../../../../helpers/auth/auth-service.setup.js';

const OWNER = { user_id: TRAINER.id, role: 'trainer' };

describe('auth.service logout con push_token', () => {
  beforeEach(() => {
    mockRepo.revokeRefreshToken.mockResolvedValue();
    mockPushTokensRepo.deleteTokenForUser.mockResolvedValue();
  });

  it('sin push_token solo revoca: no busca dueño ni borra tokens de push', async () => {
    await authService.logout({ refresh_token: 'rt' });
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith(hashToken('rt'));
    expect(mockRepo.findRefreshTokenOwner).not.toHaveBeenCalled();
    expect(mockPushTokensRepo.deleteTokenForUser).not.toHaveBeenCalled();
  });

  it('con push_token revoca y borra el token de push del dueño del refresh', async () => {
    mockRepo.findRefreshTokenOwner.mockResolvedValue(OWNER);
    await authService.logout({ refresh_token: 'rt', push_token: 'fcm-1' });
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith(hashToken('rt'));
    expect(mockRepo.findRefreshTokenOwner).toHaveBeenCalledWith(hashToken('rt'));
    expect(mockPushTokensRepo.deleteTokenForUser).toHaveBeenCalledWith(
      { id: TRAINER.id, role: 'trainer' },
      'fcm-1'
    );
  });

  it('usa el user_id y el rol del dueño (un alumno no borra como entrenador)', async () => {
    mockRepo.findRefreshTokenOwner.mockResolvedValue({ user_id: 'student-9', role: 'student' });
    await authService.logout({ refresh_token: 'rt', push_token: 'fcm-1' });
    expect(mockPushTokensRepo.deleteTokenForUser).toHaveBeenCalledWith(
      { id: 'student-9', role: 'student' },
      'fcm-1'
    );
  });

  it('refresh desconocido: no borra nada y responde igual', async () => {
    mockRepo.findRefreshTokenOwner.mockResolvedValue(null);
    await expect(
      authService.logout({ refresh_token: 'nadie', push_token: 'fcm-1' })
    ).resolves.toBeUndefined();
    expect(mockPushTokensRepo.deleteTokenForUser).not.toHaveBeenCalled();
  });

  it('reintento con el refresh ya revocado: igual borra el push token del dueño', async () => {
    // findRefreshTokenOwner no filtra por revoked_at: devuelve al dueño igual.
    mockRepo.findRefreshTokenOwner.mockResolvedValue(OWNER);
    await authService.logout({ refresh_token: 'rt', push_token: 'fcm-1' });
    await authService.logout({ refresh_token: 'rt', push_token: 'fcm-1' });
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledTimes(2);
    expect(mockPushTokensRepo.deleteTokenForUser).toHaveBeenCalledTimes(2);
  });

  it('un error al borrar el push token no hace fallar el logout (se loguea)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRepo.findRefreshTokenOwner.mockResolvedValue(OWNER);
    mockPushTokensRepo.deleteTokenForUser.mockRejectedValue(new Error('db caída'));
    await expect(
      authService.logout({ refresh_token: 'rt', push_token: 'fcm-1' })
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('un error al buscar al dueño tampoco hace fallar el logout', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRepo.findRefreshTokenOwner.mockRejectedValue(new Error('db caída'));
    await expect(
      authService.logout({ refresh_token: 'rt', push_token: 'fcm-1' })
    ).resolves.toBeUndefined();
    expect(mockPushTokensRepo.deleteTokenForUser).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
