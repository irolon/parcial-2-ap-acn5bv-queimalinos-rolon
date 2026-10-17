import {
  mockRepo,
  authService,
  verifyAccessToken,
  hashToken,
  TRAINER,
} from '../../../../helpers/auth/auth-service.setup.js';

describe('auth.service', () => {
  describe('refresh', () => {
    it('emite un nuevo access token con un refresh válido', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-1',
        user_id: TRAINER.id,
        role: 'trainer',
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        revoked_at: null,
      });

      const result = await authService.refresh({ refresh_token: 'algun-token' });
      expect(verifyAccessToken(result.token).sub).toBe(TRAINER.id);
      // Busca por el HASH del token, no por el token en claro.
      expect(mockRepo.findRefreshToken).toHaveBeenCalledWith(hashToken('algun-token'));
    });

    it('rechaza un refresh token inexistente', async () => {
      mockRepo.findRefreshToken.mockResolvedValue(null);
      await expect(authService.refresh({ refresh_token: 'x' })).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('rechaza un refresh token expirado', async () => {
      mockRepo.findRefreshToken.mockResolvedValue({
        user_id: TRAINER.id,
        role: 'trainer',
        expires_at: new Date(Date.now() - 1000).toISOString(),
        revoked_at: null,
      });
      await expect(authService.refresh({ refresh_token: 'x' })).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  describe('logout', () => {
    it('revoca el refresh token por su hash', async () => {
      mockRepo.revokeRefreshToken.mockResolvedValue();
      await authService.logout({ refresh_token: 'algun-token' });
      expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith(hashToken('algun-token'));
    });
  });
});
