import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  historyService,
  mockHistoryRepo,
  mockSessionHistoryRepo,
  mockTemplatesRepo,
  mockProgressRepo,
  STUDENT_ID,
  EX1,
  EX2,
} from '../../../helpers/trainer-ai/trainer-ai-service.setup.js';

const NOW = new Date('2026-11-08T15:00:00Z');
const EMPTY = { sessions_per_week: 0, days_since_last_session: null, avg_rpe: null, exercises: [] };
const set = (session_id, exercise_id, actual_kg, actual_reps, completed = true) => ({
  session_id,
  exercise_id,
  actual_kg,
  actual_reps,
  completed,
});

describe('trainer-ai · history.service · buildStudentHistory', () => {
  beforeEach(() => {
    mockHistoryRepo.findFinishedSessionsSince.mockReset();
    mockSessionHistoryRepo.findSetsForSessions.mockReset();
    mockTemplatesRepo.findExercisesByIds.mockReset();
    mockProgressRepo.fetchLastSessionKg.mockReset();
  });

  it('sin sesiones devuelve el resumen vacío sin más consultas', async () => {
    mockHistoryRepo.findFinishedSessionsSince.mockResolvedValue([]);
    await expect(historyService.buildStudentHistory(STUDENT_ID, NOW)).resolves.toEqual(EMPTY);
    expect(mockSessionHistoryRepo.findSetsForSessions).not.toHaveBeenCalled();
    expect(mockTemplatesRepo.findExercisesByIds).not.toHaveBeenCalled();
    expect(mockProgressRepo.fetchLastSessionKg).not.toHaveBeenCalled();
  });

  it('con sesiones lee series, ejercicios y última carga por lote', async () => {
    mockHistoryRepo.findFinishedSessionsSince.mockResolvedValue([
      { id: 'ss-1', finished_at: '2026-11-06T15:00:00Z', rpe: '7.0' },
      { id: 'ss-2', finished_at: '2026-11-02T15:00:00Z', rpe: null },
    ]);
    mockSessionHistoryRepo.findSetsForSessions.mockResolvedValue([
      set('ss-1', EX1, '60.0', 8),
      set('ss-2', EX1, '65.0', 6),
      set('ss-2', EX2, null, 12),
      set('ss-2', EX2, 20, 5, false),
    ]);
    mockTemplatesRepo.findExercisesByIds.mockResolvedValue([
      { id: EX1, name: 'Press banca plano', muscle_group: 'chest', equipment: 'barbell', video_url: null },
      { id: EX2, name: 'Flexiones', muscle_group: 'chest', equipment: 'bodyweight', video_url: null },
    ]);
    mockProgressRepo.fetchLastSessionKg.mockResolvedValue({ [EX1]: '65.0' });

    const out = await historyService.buildStudentHistory(STUDENT_ID, NOW);

    expect(mockHistoryRepo.findFinishedSessionsSince).toHaveBeenCalledWith(STUDENT_ID, '2026-10-11T15:00:00.000Z');
    expect(mockSessionHistoryRepo.findSetsForSessions).toHaveBeenCalledWith(['ss-1', 'ss-2']);
    expect(mockTemplatesRepo.findExercisesByIds).toHaveBeenCalledWith([EX1, EX2]);
    expect(mockProgressRepo.fetchLastSessionKg).toHaveBeenCalledWith(STUDENT_ID, [EX1, EX2]);
    expect(out).toEqual({
      sessions_per_week: 0.5,
      days_since_last_session: 2,
      avg_rpe: 7,
      exercises: [
        {
          exercise_id: EX1,
          exercise_name: 'Press banca plano',
          muscle_group: 'chest',
          sessions: 2,
          best_set: { kg: 65, reps: 6 },
          last_kg: 65,
        },
        {
          exercise_id: EX2,
          exercise_name: 'Flexiones',
          muscle_group: 'chest',
          sessions: 1,
          best_set: { kg: null, reps: 12 },
          last_kg: null,
        },
      ],
    });
  });

  it('con sesiones pero sin series completadas no consulta ejercicios ni última carga', async () => {
    mockHistoryRepo.findFinishedSessionsSince.mockResolvedValue([
      { id: 'ss-1', finished_at: '2026-11-06T15:00:00Z', rpe: null },
    ]);
    mockSessionHistoryRepo.findSetsForSessions.mockResolvedValue([set('ss-1', EX1, 50, 8, false)]);
    const out = await historyService.buildStudentHistory(STUDENT_ID, NOW);
    expect(out).toEqual({ ...EMPTY, sessions_per_week: 0.3, days_since_last_session: 2 });
    expect(mockTemplatesRepo.findExercisesByIds).not.toHaveBeenCalled();
    expect(mockProgressRepo.fetchLastSessionKg).not.toHaveBeenCalled();
  });
});
