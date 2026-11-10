import { jest, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Setup propio de extra-context.service: mockea history.service (que el setup compartido deja real,
// porque lo prueban los tests de history.service). Cada test file tiene su registro de módulos.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockContextRepo = { findRecentRoutines: jest.fn() };
jest.unstable_mockModule(src('repositories/trainer-ai/ai-context.repository.js'), () => mockContextRepo);

export const mockRoutinesRepo = { findActiveRoutinesForStudent: jest.fn() };
jest.unstable_mockModule(src('repositories/routines/routines.repository.js'), () => mockRoutinesRepo);

export const mockHistoryService = { buildStudentHistory: jest.fn() };
jest.unstable_mockModule(src('services/trainer-ai/history.service.js'), () => mockHistoryService);

export const extraContextService = await import(src('services/trainer-ai/extra-context.service.js'));

export const TRAINER_ID = '11111111-1111-4111-8111-111111111111';
export const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
export const NOW = new Date('2026-11-08T12:00:00Z');
export const SUMMARY = { sessions_per_week: 2, days_since_last_session: 1, avg_rpe: 7, exercises: [] };

beforeEach(() => {
  mockContextRepo.findRecentRoutines.mockResolvedValue([]);
  mockRoutinesRepo.findActiveRoutinesForStudent.mockResolvedValue([]);
  mockHistoryService.buildStudentHistory.mockResolvedValue(SUMMARY);
});
