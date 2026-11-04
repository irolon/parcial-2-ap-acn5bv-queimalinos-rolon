import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  challenges,
  mockChallenges as repo,
  mockAccess,
  TRAINER,
  STUDENT,
  challengeRow,
  resetMocks,
} from '../../../../helpers/gamification/challenges.setup.js';

beforeEach(resetMocks);

describe('listChallenges', () => {
  it('trainer: pide globales + propios con su id y el filtro', async () => {
    repo.findVisible.mockResolvedValue([challengeRow()]);
    await expect(challenges.listChallenges(TRAINER, { goal_type: 'volume' })).resolves.toHaveLength(1);
    expect(repo.findVisible).toHaveBeenCalledWith('tr-1', 'volume');
  });

  it('alumno: usa el entrenador del alumno', async () => {
    mockAccess.assertCanAccessStudent.mockResolvedValue({ id: 'st-1', trainer_id: 'tr-9' });
    repo.findVisible.mockResolvedValue([]);
    await challenges.listChallenges(STUDENT, {});
    expect(repo.findVisible).toHaveBeenCalledWith('tr-9', undefined);
  });

  it('trainer: suma assignments_count y active_count por desafío', async () => {
    repo.findVisible.mockResolvedValue([challengeRow({ id: 'c1' }), challengeRow({ id: 'c2' })]);
    repo.countByChallenge.mockResolvedValue([
      { challenge_id: 'c1', status: 'active' },
      { challenge_id: 'c1', status: 'completed' },
    ]);
    const list = await challenges.listChallenges(TRAINER, {});
    expect(repo.countByChallenge).toHaveBeenCalledWith('tr-1', ['c1', 'c2']);
    expect(list[0]).toMatchObject({ id: 'c1', assignments_count: 2, active_count: 1 });
    expect(list[1]).toMatchObject({ id: 'c2', assignments_count: 0, active_count: 0 });
  });

  it('alumno: no suma conteos', async () => {
    repo.findVisible.mockResolvedValue([challengeRow()]);
    const [item] = await challenges.listChallenges(STUDENT, {});
    expect(item).not.toHaveProperty('assignments_count');
    expect(item).not.toHaveProperty('active_count');
    expect(repo.countByChallenge).not.toHaveBeenCalled();
  });
});

describe('activeStudents', () => {
  it('devuelve los ids activos de sus alumnos', async () => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id: null }));
    repo.findActiveStudentIds.mockResolvedValue(['st-1', 'st-2']);
    await expect(challenges.activeStudents(TRAINER, 'ch-1')).resolves.toEqual(['st-1', 'st-2']);
    expect(repo.findActiveStudentIds).toHaveBeenCalledWith('ch-1', 'tr-1');
  });

  it('desafío propio del entrenador: devuelve los ids de sus alumnos', async () => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id: 'tr-1' }));
    repo.findActiveStudentIds.mockResolvedValue(['st-1']);
    await expect(challenges.activeStudents(TRAINER, 'ch-1')).resolves.toEqual(['st-1']);
    expect(repo.findActiveStudentIds).toHaveBeenCalledWith('ch-1', 'tr-1');
  });

  it('desafío ajeno → CHALLENGE_NOT_FOUND', async () => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id: 'tr-2' }));
    await expect(challenges.activeStudents(TRAINER, 'ch-1')).rejects.toMatchObject({
      statusCode: 404,
      code: 'CHALLENGE_NOT_FOUND',
    });
    expect(repo.findActiveStudentIds).not.toHaveBeenCalled();
  });
});
