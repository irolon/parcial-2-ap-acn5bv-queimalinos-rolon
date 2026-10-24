import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de routines.service (divididos en
// tests/unit/services/routines/routines.service/). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockRepo = {
  isStudentOfTrainer: jest.fn(),
  findAccessibleExerciseIds: jest.fn(),
  createRoutine: jest.fn(),
  addRoutineExercises: jest.fn(),
  findRoutinesByTrainer: jest.fn(),
  findRoutineById: jest.fn(),
  findRoutineByIdWithExercises: jest.fn(),
  updateRoutine: jest.fn(),
  deleteRoutine: jest.fn(),
  findActiveRoutineForStudentToday: jest.fn(),
  findActiveRoutinesForStudent: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/routines/routines.repository.js'),
  () => mockRepo
);

export const mockTemplatesRepo = { findTemplateById: jest.fn() };
jest.unstable_mockModule(
  src('repositories/routine-templates/routine-templates.repository.js'),
  () => mockTemplatesRepo
);

export const mockRoutineExercisesRepo = {
  findRoutineExercise: jest.fn(),
  countRoutineExercises: jest.fn(),
  findMaxOrderIndex: jest.fn(),
  updateRoutineExercise: jest.fn(),
  deleteRoutineExercise: jest.fn(),
};
jest.unstable_mockModule(
  src('repositories/routines/routine-exercises.repository.js'),
  () => mockRoutineExercisesRepo
);

export const service = await import(src('services/routines/routines.service.js'));

export const TRAINER_ID = 'trainer-1';
export const ROUTINE = { id: 'rt-1', trainer_id: TRAINER_ID, student_id: 'st-1', name: 'Full body', goal: 'hypertrophy', days: ['monday'] };
export const BODY = {
  student_id: 'st-1',
  name: 'Full body',
  goal: 'hypertrophy',
  days: ['monday'],
  exercises: [{ exercise_id: 'ex-1', sets: 4, reps: 8 }],
};
