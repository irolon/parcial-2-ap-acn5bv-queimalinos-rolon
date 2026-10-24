import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de routine-templates.service
// (divididos en tests/unit/services/routine-templates/routine-templates.service/).
// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  findTemplates: jest.fn(),
  findTemplateById: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  findExercisesByIds: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/routine-templates/routine-templates.repository.js'),
  () => mockRepo
);

export const mockRoutinesRepo = {
  findAccessibleExerciseIds: jest.fn(),
  findRoutineByIdWithExercises: jest.fn(),
  isStudentOfTrainer: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/routines/routines.repository.js'),
  () => mockRoutinesRepo
);

export const mockRoutinesService = { createWithExercises: jest.fn() };
jest.unstable_mockModule(
  src('services/routines/routines.service.js'),
  () => mockRoutinesService
);

export const service = await import(src('services/routine-templates/routine-templates.service.js'));

export const TRAINER_ID = 'trainer-1';
export const STRUCTURE = {
  version: 1,
  days: ['monday', 'wednesday'],
  exercises: [
    { exercise_id: 'ex-1', sets: 4, reps: 8, rest_seconds: null, suggested_kg: null, tempo: null, notes: null, order: 0 },
  ],
};
export const TEMPLATE = {
  id: 'tp-1',
  trainer_id: TRAINER_ID,
  name: 'Fuerza',
  goal: 'strength',
  level: null,
  frequency_per_week: 2,
  generated_by_ai: false,
  structure: STRUCTURE,
};
