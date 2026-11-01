import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures compartidos por los tests de mensajería. Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importan los services.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockMessagesRepo = {
  insertMessage: jest.fn(),
  insertMany: jest.fn(),
  findPage: jest.fn(),
  markRead: jest.fn(),
  countUnread: jest.fn(),
  findLastByStudents: jest.fn(),
  countUnreadByStudents: jest.fn(),
};
export const mockImagesRepo = {
  uploadImage: jest.fn(),
  removeImage: jest.fn(),
  signUrls: jest.fn(),
};
export const mockStudentsRepo = {
  findStudentById: jest.fn(),
  findActiveStudentsByTrainer: jest.fn(),
  findActiveStudentsByIds: jest.fn(),
};
export const mockAuthRepo = { findTrainerById: jest.fn() };

jest.unstable_mockModule(src('repositories/messages/messages.repository.js'), () => mockMessagesRepo);
jest.unstable_mockModule(src('repositories/messages/message-images.repository.js'), () => mockImagesRepo);
jest.unstable_mockModule(src('repositories/students/students.repository.js'), () => mockStudentsRepo);
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockAuthRepo);

export const TRAINER = { id: '11111111-1111-4111-8111-111111111111', role: 'trainer' };
export const OTHER_TRAINER_ID = '99999999-9999-4999-8999-999999999999';
export const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
export const STUDENT = { id: STUDENT_ID, role: 'student' };
export const OTHER_STUDENT_ID = '33333333-3333-4333-8333-333333333333';

/** Ficha del alumno como la devuelve findStudentById. */
export const studentRow = (over = {}) => ({
  id: STUDENT_ID,
  trainer_id: TRAINER.id,
  name: 'Ana',
  avatar_url: null,
  active: true,
  ...over,
});

export const messageRow = (over = {}) => ({
  id: 'm-1',
  student_id: STUDENT_ID,
  sender_role: 'trainer',
  body: 'hola',
  image_path: null,
  broadcast_id: null,
  read_at: null,
  created_at: '2026-10-31T12:00:00.000Z',
  ...over,
});

export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
export const PDF = Buffer.from('%PDF-1.4 contenido');
