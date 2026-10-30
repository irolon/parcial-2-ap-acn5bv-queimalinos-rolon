import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de sessions.service (divididos en
// tests/unit/services/sessions/sessions.service/). Ruta absoluta: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  insertSession: jest.fn(),
  findSessionById: jest.fn(),
  updateSession: jest.fn(),
  isRoutineOfStudent: jest.fn(),
};
jest.unstable_mockModule(src('repositories/sessions/sessions.repository.js'), () => mockRepo);

export const mockEvaluate = { evaluateStudent: jest.fn() };
jest.unstable_mockModule(src('services/gamification/evaluate.service.js'), () => mockEvaluate);

export const service = await import(src('services/sessions/sessions.service.js'));

export const STUDENT_ID = 'st-1';
export const SESSION_ID = '11111111-1111-4111-8111-111111111111';
export const ROUTINE_ID = '22222222-2222-4222-8222-222222222222';
export const BODY = {
  id: SESSION_ID,
  routine_id: null,
  started_at: '2026-10-27T10:00:00-03:00',
  finished_at: null,
  rpe: null,
  notes: null,
};
export const STORED = {
  id: SESSION_ID,
  student_id: STUDENT_ID,
  routine_id: null,
  started_at: '2026-10-27T10:00:00-03:00',
  finished_at: null,
  rpe: null,
  notes: null,
  has_modifications: false,
};
