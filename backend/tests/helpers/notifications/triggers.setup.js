import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockNotify = { notify: jest.fn(), pushOnly: jest.fn() };
export const mockData = {
  findStudentInfo: jest.fn(),
  findExerciseNames: jest.fn(),
  findAchievementDescriptions: jest.fn(),
  existsForSession: jest.fn(),
};
export const mockHistory = { fetchSessionRecords: jest.fn() };
jest.unstable_mockModule(src('services/notifications/notify.service.js'), () => mockNotify);
jest.unstable_mockModule(src('repositories/notifications/trigger-data.repository.js'), () => mockData);
jest.unstable_mockModule(src('repositories/sessions/session-history.repository.js'), () => mockHistory);

export const triggers = await import(src('services/notifications/triggers.service.js'));

export const STUDENT_ID = 'st-1';
export const TRAINER_ID = 'tr-1';
export const SESSION = { id: 's-1', started_at: '2026-10-27T10:00:00-03:00', finished_at: '2026-10-27T11:00:00-03:00' };
export const EX_A = 'ex-a';
export const EX_B = 'ex-b';

/** Estado base: alumno con entrenador, nada notificado antes, ejercicios con nombre. */
export function arrange() {
  mockData.findStudentInfo.mockResolvedValue({ id: STUDENT_ID, name: 'Lucía', trainer_id: TRAINER_ID });
  mockData.existsForSession.mockResolvedValue(false);
  mockData.findExerciseNames.mockResolvedValue(new Map([[EX_A, 'Press banca'], [EX_B, 'Sentadilla']]));
  mockData.findAchievementDescriptions.mockResolvedValue(new Map([['first', 'Tu primera sesión']]));
  mockHistory.fetchSessionRecords.mockResolvedValue([]);
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
}
