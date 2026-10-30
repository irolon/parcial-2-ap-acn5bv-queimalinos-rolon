import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures de session-history.service (tests divididos en
// tests/unit/services/sessions/session-history.service/).
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  findSessionsPage: jest.fn(),
  findStudentSession: jest.fn(),
  findSessionById: jest.fn(),
  updateTrainerComment: jest.fn(),
  findSetsForSessions: jest.fn(),
  fetchSessionRecords: jest.fn(),
  findRoutinesByIds: jest.fn(),
  findRoutineExercisesByIds: jest.fn(),
  findExercisesByIds: jest.fn(),
};
export const mockAccess = { assertCanAccessStudent: jest.fn() };
export const mockStudents = { findStudentById: jest.fn() };
jest.unstable_mockModule(src('repositories/sessions/session-history.repository.js'), () => mockRepo);
jest.unstable_mockModule(src('services/students/student-access.service.js'), () => mockAccess);
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudents);

export const mockTriggers = {
  onSessionClosed: jest.fn(),
  onSessionModified: jest.fn(),
  onSessionCommented: jest.fn(),
};
jest.unstable_mockModule(src('services/notifications/triggers.service.js'), () => mockTriggers);

export const service = await import(src('services/sessions/session-history.service.js'));

export const USER = { id: 'tr-1', role: 'trainer' };
export const STUDENT_ID = 'st-1';
export const S1 = 's-1';
export const S2 = 's-2';

export const row = (id, extra = {}) => ({
  id,
  student_id: STUDENT_ID,
  routine_id: 'r-1',
  started_at: '2026-10-27T10:00:00Z',
  finished_at: '2026-10-27T10:54:00Z',
  rpe: 8,
  notes: 'ok',
  trainer_comment: null,
  has_modifications: false,
  ...extra,
});

export const set = (id, sessionId, extra = {}) => ({
  id,
  session_id: sessionId,
  exercise_id: 'e-1',
  original_exercise_id: null,
  routine_exercise_id: null,
  set_number: 1,
  actual_reps: 10,
  actual_kg: 50,
  completed: true,
  executed_at: '2026-10-27T10:05:00Z',
  ...extra,
});
