import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Mocks y fixtures de evaluate.service / achievements.service. Ruta absoluta:
// el mock tiene que resolver al MISMO archivo que importa el service.
const src = (p) => fileURLToPath(new URL(`../../../src/${p}`, import.meta.url));

export const mockGam = {
  findCatalog: jest.fn(),
  findUnlockedAchievementIds: jest.fn(),
  findStudentAchievements: jest.fn(),
  insertUnlocked: jest.fn(),
  findStreak: jest.fn(),
  upsertStreak: jest.fn(),
};
export const mockData = {
  findClosedSessions: jest.fn(),
  findAssignedDays: jest.fn(),
  findActiveAssignments: jest.fn(),
  findCompletedSets: jest.fn(),
  findWeights: jest.fn(),
  updateAssignment: jest.fn(),
};
export const mockHistory = { fetchSessionRecords: jest.fn() };
export const mockAccess = { assertCanAccessStudent: jest.fn() };
jest.unstable_mockModule(src('repositories/gamification/gamification.repository.js'), () => mockGam);
jest.unstable_mockModule(src('repositories/gamification/evaluate-data.repository.js'), () => mockData);
jest.unstable_mockModule(src('repositories/sessions/session-history.repository.js'), () => mockHistory);
jest.unstable_mockModule(src('services/students/student-access.service.js'), () => mockAccess);

export const evaluate = await import(src('services/gamification/evaluate.service.js'));
export const achievements = await import(src('services/gamification/achievements.service.js'));
export const progress = await import(src('services/gamification/progress/achievement-progress.service.js'));

export const STUDENT_ID = 'st-1';
export const NOW = new Date('2026-10-30T15:00:00Z'); // viernes 12:00 AR

export const CATALOG = [
  { id: 'a-first', code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone', criteria: { type: 'sessions_count', value: 1 } },
  { id: 'a-s7', code: 'STREAK_7_DAYS', name: 'Racha de 7 días', category: 'streak', criteria: { type: 'streak', days: 7 } },
  { id: 'a-pr', code: 'FIRST_PR', name: 'Primer récord', category: 'pr', criteria: { type: 'pr_count', value: 1 } },
  { id: 'a-done', code: 'CHALLENGE_DONE', name: 'Desafío cumplido', category: 'milestone', criteria: { type: 'challenge' } },
];

/** Sesión cerrada el día `d` de octubre de 2026 a las 10:00 AR. */
export const session = (id, d) => ({
  id,
  started_at: `2026-10-${String(d).padStart(2, '0')}T10:00:00-03:00`,
  finished_at: `2026-10-${String(d).padStart(2, '0')}T11:00:00-03:00`,
});

export function resetMocks() {
  const all = [
    ...Object.values(mockGam),
    ...Object.values(mockData),
    mockHistory.fetchSessionRecords,
    mockAccess.assertCanAccessStudent,
  ];
  for (const fn of all) fn.mockReset();
  mockGam.findCatalog.mockResolvedValue(CATALOG);
  mockGam.findUnlockedAchievementIds.mockResolvedValue([]);
  mockGam.insertUnlocked.mockImplementation(async (rows) =>
    rows.map((r) => ({ achievement_id: r.achievement_id }))
  );
  mockGam.upsertStreak.mockResolvedValue({});
  mockData.findClosedSessions.mockResolvedValue([]);
  mockData.findAssignedDays.mockResolvedValue([]);
  mockData.findActiveAssignments.mockResolvedValue([]);
  mockData.findCompletedSets.mockResolvedValue([]);
  mockData.findWeights.mockResolvedValue([]);
  mockHistory.fetchSessionRecords.mockResolvedValue([]);
}
