import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y datos compartidos por los tests de services/chat/.
// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockStudentsRepo = { findStudentById: jest.fn() };
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudentsRepo);

export const mockSessionsRepo = { findSessionById: jest.fn() };
jest.unstable_mockModule(src('repositories/sessions/sessions.repository.js'), () => mockSessionsRepo);

export const mockExercisesRepo = { findExerciseById: jest.fn() };
jest.unstable_mockModule(src('repositories/exercises/exercises.repository.js'), () => mockExercisesRepo);

export const mockContextRepo = { findAlternatives: jest.fn() };
jest.unstable_mockModule(src('repositories/chat/chat-context.repository.js'), () => mockContextRepo);

export const mockMessagesRepo = { findDayMessages: jest.fn(), insertExchange: jest.fn() };
jest.unstable_mockModule(src('repositories/chat/chat-messages.repository.js'), () => mockMessagesRepo);

export const mockClient = { postToN8n: jest.fn() };
jest.unstable_mockModule(src('services/trainer-ai/n8n.client.js'), () => mockClient);

export const contextService = await import(src('services/chat/context.service.js'));
export const chatService = await import(src('services/chat/chat.service.js'));

export const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
export const OTHER_STUDENT = '33333333-3333-4333-8333-333333333333';
export const TRAINER_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_TRAINER = '99999999-9999-4999-8999-999999999999';
export const SESSION_ID = '44444444-4444-4444-8444-444444444444';
export const EX_BENCH = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
export const EX_DB = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
export const EX_PUSHUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

/** 12:00 de Argentina del 07/11/2026. */
export const NOW = new Date('2026-11-07T15:00:00Z');
export const DAY = { from: '2026-11-07T03:00:00.000Z', to: '2026-11-08T03:00:00.000Z' };

export const STUDENT = {
  id: STUDENT_ID,
  trainer_id: TRAINER_ID,
  name: 'Lucía Pérez',
  email: 'lucia@example.com',
  birth_date: '1995-03-01',
  avatar_url: 'https://cdn.example.com/lucia.png',
  goal: 'hypertrophy',
  level: 'intermediate',
  gym_equipment: ['dumbbell', 'machine'],
  injuries: '  Hombro derecho  ',
  active: true,
};

export const BENCH = {
  id: EX_BENCH,
  trainer_id: null,
  is_global: true,
  name: 'Press banca plano',
  muscle_group: 'chest',
  equipment: 'barbell',
  description: 'Acostado en el banco…',
  video_url: null,
};

export const ALTERNATIVES = [
  { id: EX_DB, name: 'Press con mancuernas', muscle_group: 'chest', equipment: 'dumbbell' },
  { id: EX_PUSHUP, name: 'Flexiones', muscle_group: 'chest', equipment: 'bodyweight' },
];

export const session = (patch = {}) => ({ id: SESSION_ID, student_id: STUDENT_ID, finished_at: null, ...patch });

/** Mensajes del día: `n` pares alumno/asistente, el más viejo primero. */
export function dayMessages(pairs) {
  return Array.from({ length: pairs }, (_, i) => [
    { id: `u${i}`, role: 'user', content: `pregunta ${i}`, created_at: `2026-11-07T1${i % 10}:00:00.000Z` },
    { id: `a${i}`, role: 'assistant', content: `respuesta ${i}`, created_at: `2026-11-07T1${i % 10}:00:00.000Z` },
  ]).flat();
}

/** Las filas insertadas con ids, como las devuelve la base. */
export const inserted = (rows) => rows.map((r, i) => ({ id: i === 0 ? 'msg-user' : 'msg-assistant', created_at: NOW.toISOString(), ...r }));
