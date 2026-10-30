import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  evaluate, mockGam, mockData, mockHistory, STUDENT_ID, NOW, session, resetMocks,
} from '../../../helpers/gamification/evaluate.setup.js';

const run = () => evaluate.evaluateStudent(STUDENT_ID, { now: NOW });
const codes = (r) => r.unlocked.map((u) => u.code);

const assignment = (challenge, extra = {}) => ({
  id: 'sc-1',
  challenge_id: 'c-1',
  started_at: '2026-10-01T00:00:00Z',
  ends_at: '2026-11-10T00:00:00Z',
  challenge: { reward_achievement_id: null, ...challenge },
  ...extra,
});

beforeEach(resetMocks);

describe('evaluateStudent', () => {
  it('primera sesión cerrada → FIRST_SESSION con context de esa sesión y racha guardada', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    const result = await run();
    expect(result.unlocked).toEqual([{ code: 'FIRST_SESSION', name: 'Primera sesión', category: 'milestone' }]);
    expect(mockGam.insertUnlocked).toHaveBeenCalledWith([
      { student_id: STUDENT_ID, achievement_id: 'a-first', context: { session_id: 's-1' } },
    ]);
    expect(mockGam.upsertStreak).toHaveBeenCalledWith(STUDENT_ID, {
      current_days: 1, longest_days: 1, last_trained_date: '2026-10-30',
    });
  });

  it('sin sesiones cerradas no otorga nada', async () => {
    const result = await run();
    expect(result.unlocked).toEqual([]);
    expect(mockHistory.fetchSessionRecords).not.toHaveBeenCalled();
  });

  it('segunda corrida: lo ya desbloqueado no se vuelve a insertar ni a informar', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    mockGam.findUnlockedAchievementIds.mockResolvedValue(['a-first']);
    const result = await run();
    expect(mockGam.insertUnlocked).toHaveBeenCalledWith([]);
    expect(result.unlocked).toEqual([]);
  });

  it('solo informa lo realmente insertado (carrera con otra evaluación)', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    mockGam.insertUnlocked.mockResolvedValue([]);
    expect((await run()).unlocked).toEqual([]);
  });

  it('7 días asignados seguidos → STREAK_7_DAYS', async () => {
    mockData.findClosedSessions.mockResolvedValue([24, 25, 26, 27, 28, 29, 30].map((d) => session(`s-${d}`, d)));
    const result = await run();
    expect(codes(result)).toEqual(expect.arrayContaining(['FIRST_SESSION', 'STREAK_7_DAYS']));
    const streakRow = mockGam.insertUnlocked.mock.calls[0][0].find((r) => r.achievement_id === 'a-s7');
    expect(streakRow.context).toEqual({ session_id: 's-30' });
  });

  it('récord: FIRST_PR con session_id y exercise_id de la sesión más vieja con récord', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 28), session('s-2', 29)]);
    mockHistory.fetchSessionRecords.mockResolvedValue([
      { session_id: 's-2', exercise_id: 'e-9' }, { session_id: 's-2', exercise_id: 'e-8' },
    ]);
    await run();
    const row = mockGam.insertUnlocked.mock.calls[0][0].find((r) => r.achievement_id === 'a-pr');
    expect(row.context).toEqual({ session_id: 's-2', exercise_id: 'e-9' });
  });

  it('desafío alcanzado → completed + logro premio con context { challenge_id }', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 28), session('s-2', 29)]);
    mockGam.findUnlockedAchievementIds.mockResolvedValue(['a-first']);
    mockData.findActiveAssignments.mockResolvedValue([
      assignment({ goal_type: 'sessions_count', goal_value: 2, reward_achievement_id: 'a-done' }),
    ]);
    const result = await run();
    expect(mockData.updateAssignment).toHaveBeenCalledWith('sc-1', {
      current_progress: 2, status: 'completed', completed_at: NOW.toISOString(),
    });
    expect(result.unlocked).toEqual([{ code: 'CHALLENGE_DONE', name: 'Desafío cumplido', category: 'milestone' }]);
    expect(mockGam.insertUnlocked).toHaveBeenCalledWith([
      { student_id: STUDENT_ID, achievement_id: 'a-done', context: { challenge_id: 'c-1' } },
    ]);
  });

  it('desafío sin alcanzar solo actualiza el progreso y no falla aunque haya vencido', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 29)]);
    mockData.findActiveAssignments.mockResolvedValue([
      assignment(
        { goal_type: 'sessions_count', goal_value: 5 },
        { started_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-10T00:00:00Z' }
      ),
    ]);
    await run();
    expect(mockData.updateAssignment).toHaveBeenCalledWith('sc-1', { current_progress: 0 });
  });

  it('volumen de la ventana: suma reps por kg de las series completadas', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 29)]);
    mockData.findCompletedSets.mockResolvedValue([
      { session_id: 's-1', actual_reps: 10, actual_kg: 50 }, { session_id: 's-1', actual_reps: 10, actual_kg: null },
    ]);
    mockData.findActiveAssignments.mockResolvedValue([assignment({ goal_type: 'volume', goal_value: 500 })]);
    await run();
    expect(mockData.updateAssignment).toHaveBeenCalledWith('sc-1', {
      current_progress: 500, status: 'completed', completed_at: NOW.toISOString(),
    });
  });

  it('weight_target: peso inicial a started_at y último dentro de la ventana', async () => {
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 29)]);
    mockData.findWeights.mockResolvedValue([
      { weight_kg: 80, recorded_at: '2026-09-30T00:00:00Z' }, { weight_kg: 75, recorded_at: '2026-10-25T00:00:00Z' },
    ]);
    mockData.findActiveAssignments.mockResolvedValue([assignment({ goal_type: 'weight_target', goal_value: 70 })]);
    await run();
    expect(mockData.updateAssignment).toHaveBeenCalledWith('sc-1', { current_progress: 75 });
  });

  it('más de 1000 sesiones: pide los récords en lotes', async () => {
    const many = Array.from({ length: 1001 }, (_, i) => session(`s-${i}`, 20));
    mockData.findClosedSessions.mockResolvedValue(many);
    await run();
    expect(mockHistory.fetchSessionRecords).toHaveBeenCalledTimes(2);
    expect(mockHistory.fetchSessionRecords.mock.calls[1][1]).toHaveLength(1);
  });
});
