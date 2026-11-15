import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures de los tests de trainer-avatar.service. Rutas absolutas: el mock
// tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockAvatarsRepo = { upload: jest.fn(), remove: jest.fn(), signPaths: jest.fn() };
export const mockAuthRepo = { findTrainerById: jest.fn(), updateTrainer: jest.fn() };

jest.unstable_mockModule(src('repositories/students/avatars.repository.js'), () => mockAvatarsRepo);
jest.unstable_mockModule(src('repositories/auth/auth.repository.js'), () => mockAuthRepo);

export const service = await import(src('services/auth/trainer-avatar.service.js'));

export const SELF = { id: 't-1', role: 'trainer' };
export const PREV = 'trainers/t-1/vieja.jpg';
/** Firma JPEG mínima: alcanza para detectImageType. */
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
export const NEW_PATH_RE = /^trainers\/t-1\/[0-9a-f-]{36}\.jpg$/;
