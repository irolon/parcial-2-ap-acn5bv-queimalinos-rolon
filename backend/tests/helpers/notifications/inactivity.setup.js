import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockNotify = { notify: jest.fn() };
export const mockRepo = {
  findActiveStudents: jest.fn(),
  findLastClosedSessionStarts: jest.fn(),
  findStudentsNotifiedSince: jest.fn(),
};
export const mockDays = { findAssignedDays: jest.fn() };
jest.unstable_mockModule(src('services/notifications/notify.service.js'), () => mockNotify);
jest.unstable_mockModule(src('repositories/notifications/inactivity.repository.js'), () => mockRepo);
jest.unstable_mockModule(src('repositories/gamification/evaluate-data.repository.js'), () => mockDays);

export const { runInactivityAlerts } = await import(src('services/notifications/inactivity-job.service.js'));

// Viernes 30/10/2026 12:00 hora de Buenos Aires.
export const NOW = new Date('2026-10-30T15:00:00Z');
export const CREATED = '2026-10-20T12:00:00Z';

export const student = (id, extra = {}) => ({
  id, name: `Alumno ${id}`, trainer_id: `tr-${id}`, created_at: CREATED, ...extra,
});

/** Estado base: sin alumnos, sin sesiones, sin avisos previos, todos los días asignados. */
export function arrange({ students = [], lastStarts = {}, notified = [] } = {}) {
  mockRepo.findActiveStudents.mockResolvedValue(students);
  mockRepo.findLastClosedSessionStarts.mockResolvedValue(new Map(Object.entries(lastStarts)));
  mockRepo.findStudentsNotifiedSince.mockResolvedValue(new Set(notified));
  mockDays.findAssignedDays.mockResolvedValue([]);
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
}
