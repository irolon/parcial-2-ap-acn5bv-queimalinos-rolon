import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  progress, mockGam, mockData, mockHistory, mockAccess, STUDENT_ID, NOW, session, resetMocks,
} from '../../../../helpers/gamification/evaluate.setup.js';
import { Errors } from '../../../../../src/shared/utils/errors.js';

const USER = { id: 'st-1', role: 'student' };
const run = () => progress.getAchievementsProgress(USER, STUDENT_ID, { now: NOW });
const byCode = (result) => Object.fromEntries(result.achievements.map((a) => [a.code, a]));

beforeEach(resetMocks);

describe('getAchievementsProgress', () => {
  it('sin permiso no consulta nada', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden());
    await expect(run()).rejects.toMatchObject({ statusCode: 403 });
    expect(mockData.findClosedSessions).not.toHaveBeenCalled();
    expect(mockGam.findCatalog).not.toHaveBeenCalled();
  });

  it('sin sesiones: racha y datos en cero, todo el catálogo en 0 y sin desbloquear', async () => {
    mockGam.findUnlockedAt.mockResolvedValue([]);
    const result = await run();
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(USER, STUDENT_ID);
    expect(result.streak).toEqual({ current_streak_days: 0, longest_streak_days: 0, last_session_date: null });
    expect(result.facts).toEqual({ sessions_count: 0, longest_streak: 0, pr_sessions: 0, full_weeks: 0 });
    expect(result.assigned_days).toEqual([]);
    expect(result.achievements.map((a) => a.code)).toEqual(['FIRST_SESSION', 'STREAK_7_DAYS', 'FIRST_PR', 'CHALLENGE_DONE']);
    expect(byCode(result).STREAK_7_DAYS).toEqual({
      id: 'a-s7', code: 'STREAK_7_DAYS', name: 'Racha de 7 días', description: undefined, category: 'streak',
      icon_url: undefined, criteria_type: 'streak', current: 0, target: 7, unlocked_at: null,
    });
  });

  it('cuenta sesiones y racha, y recorta current a target', async () => {
    mockGam.findUnlockedAt.mockResolvedValue([]);
    mockData.findClosedSessions.mockResolvedValue([24, 25, 26, 27, 28, 29, 30].map((d) => session(`s-${d}`, d)));
    const result = await run();
    expect(result.streak).toEqual({ current_streak_days: 7, longest_streak_days: 7, last_session_date: '2026-10-30' });
    expect(result.facts.sessions_count).toBe(7);
    const map = byCode(result);
    expect(map.FIRST_SESSION).toMatchObject({ current: 1, target: 1 });
    expect(map.STREAK_7_DAYS).toMatchObject({ current: 7, target: 7, unlocked_at: null });
    expect(map.CHALLENGE_DONE).toMatchObject({ criteria_type: 'challenge', current: 0, target: 1 });
  });

  it('desbloqueado: current = target aunque los datos sean menores, con su unlocked_at', async () => {
    mockGam.findUnlockedAt.mockResolvedValue([
      { achievement_id: 'a-s7', unlocked_at: '2026-10-01T12:00:00Z' },
      { achievement_id: 'a-done', unlocked_at: '2026-10-02T12:00:00Z' },
    ]);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    const map = byCode(await run());
    expect(map.STREAK_7_DAYS).toMatchObject({ current: 7, target: 7, unlocked_at: '2026-10-01T12:00:00Z' });
    expect(map.CHALLENGE_DONE).toMatchObject({ current: 1, target: 1, unlocked_at: '2026-10-02T12:00:00Z' });
  });

  it('devuelve los días asignados con los que calculó la racha', async () => {
    mockGam.findUnlockedAt.mockResolvedValue([]);
    mockData.findAssignedDays.mockResolvedValue(['monday', 'thursday']);
    const result = await run();
    expect(result.assigned_days).toEqual(['monday', 'thursday']);
  });

  it('récords: pr_sessions sale de los récords de las sesiones cerradas', async () => {
    mockGam.findUnlockedAt.mockResolvedValue([]);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    mockHistory.fetchSessionRecords.mockResolvedValue([{ session_id: 's-1', exercise_id: 'e-1' }]);
    const result = await run();
    expect(result.facts.pr_sessions).toBe(1);
    expect(byCode(result).FIRST_PR).toMatchObject({ current: 1, target: 1 });
  });

  it('no escribe nada', async () => {
    mockGam.findUnlockedAt.mockResolvedValue([]);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    await run();
    expect(mockGam.upsertStreak).not.toHaveBeenCalled();
    expect(mockGam.insertUnlocked).not.toHaveBeenCalled();
    expect(mockData.updateAssignment).not.toHaveBeenCalled();
  });
});
