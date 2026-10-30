import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks de los repos de desafíos. Ruta absoluta: tiene que resolver al MISMO archivo.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockChallenges = {
  findVisible: jest.fn(),
  findById: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  hasActiveAssignments: jest.fn(),
  achievementExists: jest.fn(),
};
export const mockStudentChallenges = {
  findByStudent: jest.fn(),
  insertAssignment: jest.fn(),
  findActiveStudentIds: jest.fn(),
};
export const mockAccess = { assertCanAccessStudent: jest.fn() };
jest.unstable_mockModule(src('repositories/gamification/challenges.repository.js'), () => mockChallenges);
jest.unstable_mockModule(src('repositories/gamification/student-challenges.repository.js'), () => mockStudentChallenges);
jest.unstable_mockModule(src('services/students/student-access.service.js'), () => mockAccess);

export const challenges = await import(src('services/gamification/challenges.service.js'));
export const assignments = await import(src('services/gamification/challenge-assignments.service.js'));

export const TRAINER = { id: 'tr-1', role: 'trainer' };
export const STUDENT = { id: 'st-1', role: 'student' };

export const challengeRow = (over = {}) => ({
  id: 'ch-1',
  trainer_id: 'tr-1',
  name: 'Desafío',
  description: null,
  goal_type: 'sessions_count',
  goal_value: 10,
  duration_days: 30,
  reward_achievement_id: null,
  ...over,
});

export const assignmentRow = (over = {}) => ({
  id: 'sc-1',
  student_id: 'st-1',
  challenge_id: 'ch-1',
  started_at: '2026-10-30T15:00:00Z',
  ends_at: '2026-11-29T15:00:00Z',
  current_progress: 4,
  status: 'active',
  completed_at: null,
  challenge: challengeRow(),
  ...over,
});

export function resetMocks() {
  const all = [
    ...Object.values(mockChallenges),
    ...Object.values(mockStudentChallenges),
    mockAccess.assertCanAccessStudent,
  ];
  for (const fn of all) fn.mockReset();
  mockAccess.assertCanAccessStudent.mockResolvedValue({ id: 'st-1', trainer_id: 'tr-1' });
  mockChallenges.hasActiveAssignments.mockResolvedValue(false);
  mockChallenges.achievementExists.mockResolvedValue(true);
}
