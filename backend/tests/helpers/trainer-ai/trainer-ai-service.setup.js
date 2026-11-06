import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y datos compartidos por los tests de services/trainer-ai/.
// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockGenerationsRepo = {
  findGenerationTimesSince: jest.fn(),
  createGeneration: jest.fn(),
  findGenerationById: jest.fn(),
  saveGenerationTemplates: jest.fn(),
};
jest.unstable_mockModule(src('repositories/trainer-ai/ai-generations.repository.js'), () => mockGenerationsRepo);

export const mockContextRepo = { findLibraryForEquipment: jest.fn(), findRecentTemplates: jest.fn() };
jest.unstable_mockModule(src('repositories/trainer-ai/ai-context.repository.js'), () => mockContextRepo);

export const mockStudentsRepo = { findStudentById: jest.fn() };
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudentsRepo);

export const mockTemplatesRepo = { findExercisesByIds: jest.fn() };
jest.unstable_mockModule(src('repositories/routine-templates/routine-templates.repository.js'), () => mockTemplatesRepo);

export const mockTemplatesService = { getOwnedTemplate: jest.fn() };
jest.unstable_mockModule(src('services/routine-templates/routine-templates.service.js'), () => mockTemplatesService);

export const mockRoutinesService = { findMissingExerciseIds: jest.fn() };
jest.unstable_mockModule(src('services/routines/routines.service/routines.service.js'), () => mockRoutinesService);

export const mockClient = { requestRoutineProposal: jest.fn() };
jest.unstable_mockModule(src('services/trainer-ai/n8n.client.js'), () => mockClient);

export const contextService = await import(src('services/trainer-ai/context.service.js'));
export const generateService = await import(src('services/trainer-ai/generate.service.js'));
export const saveService = await import(src('services/trainer-ai/save.service.js'));

export const TRAINER_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_TRAINER = '99999999-9999-4999-8999-999999999999';
export const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
export const TEMPLATE_ID = '44444444-4444-4444-8444-444444444444';
export const GENERATION_ID = '55555555-5555-4555-8555-555555555555';
export const EX1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
export const EX2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

export const STUDENT = {
  id: STUDENT_ID,
  trainer_id: TRAINER_ID,
  name: 'Lucía Pérez',
  email: 'lucia@example.com',
  birth_date: '1995-03-01',
  goal: 'strength',
  level: 'intermediate',
  gym_equipment: ['barbell', 'dumbbell'],
  injuries: 'Hombro derecho',
  active: true,
};

export const LIBRARY = [
  { id: EX1, name: 'Press banca plano', muscle_group: 'chest', equipment: 'barbell' },
  { id: EX2, name: 'Flexiones', muscle_group: 'chest', equipment: 'bodyweight' },
];

export const exercise = (exercise_id = EX1, patch = {}) => ({
  exercise_id,
  sets: 4,
  reps: 8,
  rest_seconds: 90,
  suggested_kg: null,
  notes: null,
  ...patch,
});

/** Propuesta válida de 1 bloque (2 días) o de 2 bloques (monday + wednesday/friday). */
export const ONE_BLOCK = {
  routines: [{ name: 'Cuerpo completo', days: ['monday', 'thursday'], exercises: [exercise(EX1), exercise(EX2)] }],
  rationale: 'Base de fuerza',
};
export const TWO_BLOCKS = {
  routines: [
    { name: 'Empuje', days: ['monday'], exercises: [exercise(EX1)] },
    { name: 'Tirón', days: ['wednesday', 'friday'], exercises: [exercise(EX2)] },
  ],
  rationale: 'Split',
};

export const GENERATION = {
  id: GENERATION_ID,
  trainer_id: TRAINER_ID,
  student_id: null,
  input_params: { goal: 'hypertrophy', level: 'beginner', frequency_per_week: 2 },
  generated_routine: ONE_BLOCK,
  was_used: false,
};
