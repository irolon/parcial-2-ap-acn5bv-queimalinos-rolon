import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures de los tests de avatar.service (GX2). Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockAvatarsRepo = {
  upload: jest.fn(),
  remove: jest.fn(),
  signPaths: jest.fn(),
};
export const mockStudentsRepo = { updateStudent: jest.fn() };
export const mockAccess = { assertCanAccessStudent: jest.fn() };

jest.unstable_mockModule(src('repositories/students/avatars.repository.js'), () => mockAvatarsRepo);
jest.unstable_mockModule(src('repositories/students/students.repository/students.repository.js'), () => mockStudentsRepo);
jest.unstable_mockModule(src('services/students/student-access.service.js'), () => mockAccess);

export const service = await import(src('services/students/avatar.service.js'));

export const SELF = { id: 's-1', role: 'student' };
export const PREV = 'students/s-1/vieja.jpg';
/** Firma PNG mínima: alcanza para detectImageType. */
export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
export const NEW_PATH_RE = /^students\/s-1\/[0-9a-f-]{36}\.png$/;
