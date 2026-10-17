import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks compartidos por los tests de exercises.service (divididos en
// tests/unit/services/exercises/exercises.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  findExercises: jest.fn(),
  findExerciseById: jest.fn(),
  createExercise: jest.fn(),
  updateExercise: jest.fn(),
  deleteExercise: jest.fn(),
  findLibrary: jest.fn(),
};
jest.unstable_mockModule(src('repositories/exercises/exercises.repository.js'), () => mockRepo);

export const mockStudentsRepo = {
  findStudentById: jest.fn(),
};
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudentsRepo);

export const service = await import(src('services/exercises/exercises.service.js'));

export const TRAINER_ID = 'trainer-1';
export const OWN_EXERCISE = { id: 'ex-1', trainer_id: TRAINER_ID, name: 'Press banca', is_global: false };
export const GLOBAL_EXERCISE = { id: 'ex-2', trainer_id: null, name: 'Sentadilla', is_global: true };
