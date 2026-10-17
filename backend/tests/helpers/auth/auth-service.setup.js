import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de auth.service (divididos en
// tests/unit/services/auth/auth.service/). Rutas absolutas: el mock tiene que
// resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  createTrainer: jest.fn(),
  findTrainerByEmailWithHash: jest.fn(),
  saveRefreshToken: jest.fn(),
  findRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllForUser: jest.fn(),
};
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockRepo);

// El login también consulta el repo de students (login role-agnóstico).
export const mockStudentsRepo = {
  findStudentByEmailWithHash: jest.fn().mockResolvedValue(null),
  findStudentById: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/students/students.repository.js'),
  () => mockStudentsRepo
);

export const authService = await import(src('services/auth/auth.service.js'));
export const { hashPassword } = await import(src('shared/utils/password.js'));
export const { verifyAccessToken, hashToken } = await import(src('shared/utils/jwt.js'));

export const TRAINER = {
  id: 'trainer-uuid-1',
  name: 'Ignacio Rolon',
  email: 'ignacio@fittrainer.app',
  specialty: 'Fuerza',
  avatar_url: null,
  created_at: '2026-06-20T10:00:00Z',
};
