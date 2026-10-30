import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  achievements, mockGam, mockData, mockAccess, STUDENT_ID, resetMocks, session,
} from '../../../helpers/gamification/evaluate.setup.js';
import { Errors } from '../../../../src/shared/utils/errors.js';

const USER = { id: 'tr-1', role: 'trainer' };

beforeEach(resetMocks);

describe('achievements.service', () => {
  it('listCatalog devuelve el catálogo del repositorio', async () => {
    await expect(achievements.listCatalog()).resolves.toHaveLength(4);
  });

  it('listStudentAchievements valida acceso y devuelve las filas', async () => {
    mockGam.findStudentAchievements.mockResolvedValue([{ id: 'x' }]);
    await expect(achievements.listStudentAchievements(USER, STUDENT_ID)).resolves.toEqual([{ id: 'x' }]);
    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(USER, STUDENT_ID);
  });

  it('sin permiso no consulta nada', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(Errors.forbidden());
    await expect(achievements.listStudentAchievements(USER, STUDENT_ID)).rejects.toMatchObject({ statusCode: 403 });
    await expect(achievements.getStreak(USER, STUDENT_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockGam.findStudentAchievements).not.toHaveBeenCalled();
    expect(mockGam.findStreak).not.toHaveBeenCalled();
  });

  it('getStreak lee la fila guardada con el shape del contrato', async () => {
    mockGam.findStreak.mockResolvedValue({ current_days: 3, longest_days: 9, last_trained_date: '2026-10-29' });
    await expect(achievements.getStreak(USER, STUDENT_ID)).resolves.toEqual({
      current_streak_days: 3, longest_streak_days: 9, last_session_date: '2026-10-29',
    });
    expect(mockGam.upsertStreak).not.toHaveBeenCalled();
  });

  it('getStreak sin fila evalúa (y guarda) la racha', async () => {
    mockGam.findStreak.mockResolvedValue(null);
    mockData.findClosedSessions.mockResolvedValue([session('s-1', 30)]);
    const result = await achievements.getStreak(USER, STUDENT_ID);
    expect(mockGam.upsertStreak).toHaveBeenCalled();
    expect(result.last_session_date).toBe('2026-10-30');
  });
});
