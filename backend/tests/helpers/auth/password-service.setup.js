import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks compartidos por los tests de password.service (GX1: cambio y blanqueo,
// en tests/unit/services/auth/password.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockCredentialsRepo = {
  findPasswordHash: jest.fn(),
  setPassword: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/auth/credentials.repository.js'),
  () => mockCredentialsRepo
);

export const mockAuthRepo = {
  findRefreshToken: jest.fn(),
  revokeAllForUser: jest.fn(),
  revokeAllForUserExcept: jest.fn(),
};
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockAuthRepo);

export const mockPushTokensRepo = { deleteAllForUserExcept: jest.fn() };
jest.unstable_mockModule(
  src('repositories/notifications/push-tokens.repository.js'),
  () => mockPushTokensRepo
);

// El blanqueo usa el chequeo de ownership de /students/:id.
export const mockStudentAccess = { assertCanAccessStudent: jest.fn() };
jest.unstable_mockModule(
  src('services/students/student-access.service.js'),
  () => mockStudentAccess
);

export const passwordService = await import(src('services/auth/password.service.js'));
export const { hashPassword, verifyPassword } = await import(src('shared/utils/password.js'));
export const { verifyAccessToken, hashToken } = await import(src('shared/utils/jwt.js'));

/** Refresh token vigente del usuario dado (fila de refresh_tokens). */
export const storedRefresh = (userId, role) => ({
  id: 'rt-1',
  user_id: userId,
  role,
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  revoked_at: null,
});
