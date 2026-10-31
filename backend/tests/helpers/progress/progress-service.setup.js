import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de progress.service (divididos en
// tests/unit/services/progress/progress.service/). Ruta absoluta: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockProgressRepo = {
  fetchExerciseProgress: jest.fn(),
  fetchProgressExercises: jest.fn(),
  fetchWeeklyVolume: jest.fn(),
};
export const mockRoutinesRepo = { findAccessibleExerciseIds: jest.fn() };
export const mockExercisesRepo = { findExerciseById: jest.fn() };
export const mockAccess = { assertCanAccessStudent: jest.fn() };
export const mockBodyMetrics = { list: jest.fn() };

jest.unstable_mockModule(src('repositories/progress/progress.repository.js'), () => mockProgressRepo);
jest.unstable_mockModule(src('repositories/routines/routines.repository.js'), () => mockRoutinesRepo);
jest.unstable_mockModule(src('repositories/exercises/exercises.repository.js'), () => mockExercisesRepo);
jest.unstable_mockModule(src('services/students/student-access.service.js'), () => mockAccess);
jest.unstable_mockModule(src('services/body-metrics/body-metrics.service.js'), () => mockBodyMetrics);

export const service = await import(src('services/progress/progress.service.js'));

export const TRAINER = { id: 'tr-1', role: 'trainer' };
export const STUDENT = { id: '33333333-3333-4333-8333-333333333333', role: 'student' };
export const EXERCISE_ID = '44444444-4444-4444-8444-444444444444';
export const EXERCISE = { id: EXERCISE_ID, name: 'Press de banca', muscle_group: 'chest', extra: 'x' };
export const STUDENT_ROW = { id: STUDENT.id, trainer_id: TRAINER.id };
export const ROWS = [
  { date: '2026-10-20', max_kg: '60', volume_kg: '1800.00', e1rm_kg: '72.04', sets: 3, reps: 30 },
  { date: '2026-10-27', max_kg: '62.5', volume_kg: '1875', e1rm_kg: '79.17', sets: 3, reps: 30 },
];
export const EXERCISE_ROWS = [
  { exercise_id: EXERCISE_ID, name: 'Press de banca', muscle_group: 'chest', days: 18, last_date: '2026-10-27' },
];
export const WEEK_ROWS = [
  { week_start: '2026-10-20', volume_kg: '5230.45', sessions: 3 },
  { week_start: '2026-10-27', volume_kg: '0', sessions: 0 },
];
