import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de students.service (divididos en
// tests/unit/services/students/students.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockInvitationsRepo = {
  findInvitationByToken: jest.fn(),
  claimInvitation: jest.fn(),
  releaseInvitation: jest.fn(),
};
export const mockStudentsRepo = {
  createStudent: jest.fn(),
  findStudentsByTrainer: jest.fn(),
  findLastSessionDates: jest.fn(),
  findActiveRoutineDays: jest.fn(),
  findFinishedSessionDates: jest.fn(),
  findStudentById: jest.fn(),
  updateStudent: jest.fn(),
};
export const mockIssueTokens = jest.fn();

jest.unstable_mockModule(
  src('repositories/invitations/invitations.repository.js'),
  () => mockInvitationsRepo
);
jest.unstable_mockModule(
  src('repositories/students/students.repository.js'),
  () => mockStudentsRepo
);
jest.unstable_mockModule(src('services/auth/auth.service.js'), () => ({
  issueTokens: mockIssueTokens,
}));

export const mockAuthRepo = { revokeAllForUser: jest.fn() };
export const mockRoutinesRepo = { findActiveRoutineSummary: jest.fn() };
export const mockBodyMetricsService = { latestForStudent: jest.fn() };

jest.unstable_mockModule(
  src('repositories/auth/auth.repository.js'),
  () => mockAuthRepo
);
jest.unstable_mockModule(
  src('repositories/routines/routines.repository.js'),
  () => mockRoutinesRepo
);
jest.unstable_mockModule(
  src('services/body-metrics/body-metrics.service.js'),
  () => mockBodyMetricsService
);

export const service = await import(src('services/students/students.service.js'));

export const VALID_INVITATION = {
  id: 'inv-1',
  student_name: 'Pedro Gómez',
  student_email: 'pedro@mail.com',
  student_goal: 'hypertrophy',
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  used_at: null,
  trainer: { id: 'trainer-1', name: 'Ignacio' },
};

export const CREATED_STUDENT = {
  id: 'student-1',
  trainer_id: 'trainer-1',
  name: 'Pedro Gómez',
  email: 'pedro@mail.com',
  goal: 'hypertrophy',
};

export const TRAINER = { id: 'trainer-1', role: 'trainer' };
export const STUDENT_ROW = {
  id: 'student-1',
  trainer_id: 'trainer-1',
  name: 'Ana',
  active: true,
  gym_equipment: ['barbell'],
  injuries: null,
  level: 'beginner',
};
export const LATEST = { id: 'm1', weight_kg: 60, height_cm: 165, bmi: 22 };
export const ROUTINE = { id: 'r1', name: 'Fuerza 3 días', days: ['monday', 'wednesday', 'friday'] };
