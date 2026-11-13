import {
  mockRepo,
  mockCredentialsRepo,
  authService,
  hashPassword,
  hashToken,
  TRAINER,
} from '../../../../helpers/auth/auth-service.setup.js';

/**
 * Login concurrente con un cambio de clave (auditoría, fila 12): el login verifica la clave vieja, el cambio guarda la
 * nueva y revoca dos veces, y recién después el login guarda su refresh. Ese refresh no puede quedar vivo.
 */
describe('auth.service · login concurrente con un cambio de clave', () => {
  let tokens;
  let currentHash;

  beforeEach(async () => {
    currentHash = await hashPassword('Vieja1234');
    tokens = new Map();
    mockRepo.findTrainerByEmailWithHash.mockResolvedValue({ ...TRAINER, password_hash: currentHash });
    mockRepo.revokeAllForUser.mockImplementation(async () => {
      for (const t of tokens.values()) t.revoked = true;
    });
    mockRepo.revokeRefreshToken.mockImplementation(async (tokenHash) => {
      if (tokens.has(tokenHash)) tokens.get(tokenHash).revoked = true;
    });
    mockCredentialsRepo.findPasswordHash.mockImplementation(async () => currentHash);
  });

  it('si la clave cambió (con sus dos revocaciones) antes de guardar el refresh: 401 y el refresh queda revocado', async () => {
    mockRepo.saveRefreshToken.mockImplementation(async ({ tokenHash }) => {
      // El cambio de clave entero pasa mientras este login está en vuelo.
      await mockRepo.revokeAllForUser(TRAINER.id, 'trainer');
      currentHash = await hashPassword('Nueva1234');
      await mockRepo.revokeAllForUser(TRAINER.id, 'trainer');
      tokens.set(tokenHash, { revoked: false });
    });

    await expect(authService.login({ email: TRAINER.email, password: 'Vieja1234' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
    const [saved] = mockRepo.saveRefreshToken.mock.calls[0];
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith(saved.tokenHash);
    expect([...tokens.values()].every((t) => t.revoked)).toBe(true);
  });

  it('si la clave no cambió, relee por id y el login sigue con su refresh vigente', async () => {
    mockRepo.saveRefreshToken.mockImplementation(async ({ tokenHash }) => tokens.set(tokenHash, { revoked: false }));
    const result = await authService.login({ email: TRAINER.email, password: 'Vieja1234' });
    expect(mockCredentialsRepo.findPasswordHash).toHaveBeenCalledWith(TRAINER.id, 'trainer');
    expect(tokens.get(hashToken(result.refresh_token)).revoked).toBe(false);
    expect(mockRepo.revokeRefreshToken).not.toHaveBeenCalled();
  });
});
