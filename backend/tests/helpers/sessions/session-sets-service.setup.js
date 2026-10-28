import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de session-sets.service (divididos en
// tests/unit/services/sessions/session-sets.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockSessions = { getOwnedSession: jest.fn() };
export const mockRepo = {
  findSetsByIds: jest.fn(),
  findRoutineExerciseIds: jest.fn(),
  upsertSets: jest.fn(),
  markSessionModified: jest.fn(),
};
export const mockRoutinesRepo = { findAccessibleExerciseIds: jest.fn() };
export const mockStudentsRepo = { findStudentById: jest.fn() };
jest.unstable_mockModule(src('services/sessions/sessions.service.js'), () => mockSessions);
jest.unstable_mockModule(src('repositories/sessions/session-sets.repository.js'), () => mockRepo);
jest.unstable_mockModule(src('repositories/routines/routines.repository.js'), () => mockRoutinesRepo);
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudentsRepo);

export const service = await import(src('services/sessions/session-sets.service.js'));

export const STUDENT_ID = 'st-1';
export const TRAINER_ID = 'tr-1';
export const SESSION_ID = '11111111-1111-4111-8111-111111111111';
export const ROUTINE_ID = '22222222-2222-4222-8222-222222222222';
export const EX_A = '33333333-3333-4333-8333-333333333333';
export const EX_B = '44444444-4444-4444-8444-444444444444';
export const RE_1 = '55555555-5555-4555-8555-555555555555';
export const SESSION = {
  id: SESSION_ID, student_id: STUDENT_ID, routine_id: ROUTINE_ID, finished_at: null,
};

export const setId = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** Serie cruda válida (como llega del celular). */
export const rawSet = (n, extra = {}) => ({
  id: setId(n),
  exercise_id: EX_A,
  original_exercise_id: null,
  routine_exercise_id: null,
  set_number: n,
  actual_reps: 10,
  actual_kg: 20,
  completed: true,
  executed_at: '2026-10-27T10:05:00-03:00',
  ...extra,
});

export const batch = (count = 24) => Array.from({ length: count }, (_, i) => rawSet(i + 1));

/** Estado por defecto: sesión propia con rutina, todo accesible, nada existente. */
export function arrange({
  session = SESSION, existing = [], accessible = [EX_A, EX_B], routineExercises = [RE_1],
} = {}) {
  mockSessions.getOwnedSession.mockResolvedValue(session);
  mockStudentsRepo.findStudentById.mockResolvedValue({ id: STUDENT_ID, trainer_id: TRAINER_ID });
  mockRepo.findSetsByIds.mockResolvedValue(existing);
  mockRoutinesRepo.findAccessibleExerciseIds.mockResolvedValue(accessible);
  mockRepo.findRoutineExerciseIds.mockResolvedValue(routineExercises);
  mockRepo.upsertSets.mockImplementation(async (rows) => rows.map((r) => ({ id: r.id })));
  mockRepo.markSessionModified.mockResolvedValue();
}
