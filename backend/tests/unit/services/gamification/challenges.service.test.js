import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  challenges,
  mockChallenges as repo,
  mockAccess,
  TRAINER,
  STUDENT,
  challengeRow,
  resetMocks,
} from '../../../helpers/gamification/challenges.setup.js';

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
});

describe('createChallenge', () => {
  it('guarda con trainer_id = usuario', async () => {
    repo.insert.mockResolvedValue(challengeRow());
    await challenges.createChallenge(TRAINER, { name: 'X', goal_type: 'volume', goal_value: 5, duration_days: 7 });
    expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'X', trainer_id: 'tr-1' }));
  });

  it('logro de premio inexistente → 400 en reward_achievement_id', async () => {
    repo.achievementExists.mockResolvedValue(false);
    await expect(
      challenges.createChallenge(TRAINER, { reward_achievement_id: 'a-1' })
    ).rejects.toMatchObject({ statusCode: 400, details: [{ field: 'reward_achievement_id' }] });
    expect(repo.insert).not.toHaveBeenCalled();
  });
});

describe('updateChallenge / deleteChallenge', () => {
  it('el dueño edita', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    repo.update.mockResolvedValue(challengeRow({ name: 'Nuevo' }));
    await expect(challenges.updateChallenge(TRAINER, 'ch-1', { name: 'Nuevo' })).resolves.toMatchObject({
      name: 'Nuevo',
    });
    expect(repo.update).toHaveBeenCalledWith('ch-1', { name: 'Nuevo' });
  });

  it.each([
    ['goal_type', { goal_type: 'volume' }],
    ['goal_value', { goal_value: 100 }],
  ])('cambiar %s con asignaciones activas → 409 y no actualiza', async (_n, fields) => {
    repo.findById.mockResolvedValue(challengeRow());
    repo.hasActiveAssignments.mockResolvedValue(true);
    await expect(challenges.updateChallenge(TRAINER, 'ch-1', fields)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHALLENGE_IN_USE',
    });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('cambiar la meta sin asignaciones activas actualiza', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    repo.hasActiveAssignments.mockResolvedValue(false);
    repo.update.mockResolvedValue(challengeRow({ goal_value: 100 }));
    await challenges.updateChallenge(TRAINER, 'ch-1', { goal_value: 100 });
    expect(repo.update).toHaveBeenCalledWith('ch-1', { goal_value: 100 });
  });

  it('editar nombre o repetir la misma meta con asignaciones activas no bloquea', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    repo.hasActiveAssignments.mockResolvedValue(true);
    repo.update.mockResolvedValue(challengeRow());
    await challenges.updateChallenge(TRAINER, 'ch-1', { name: 'Nuevo', goal_value: 10, goal_type: 'sessions_count' });
    expect(repo.update).toHaveBeenCalled();
  });

  it.each([
    ['global', challengeRow({ trainer_id: null })],
    ['ajeno', challengeRow({ trainer_id: 'tr-2' })],
    ['inexistente', null],
  ])('editar o borrar un desafío %s → 404', async (_n, row) => {
    repo.findById.mockResolvedValue(row);
    await expect(challenges.updateChallenge(TRAINER, 'ch-1', { name: 'X' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'CHALLENGE_NOT_FOUND',
    });
    await expect(challenges.deleteChallenge(TRAINER, 'ch-1')).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('borrar con alguna asignación (activa o terminada) → 409', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    repo.hasAssignments.mockResolvedValue(true);
    await expect(challenges.deleteChallenge(TRAINER, 'ch-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHALLENGE_IN_USE',
    });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('borrar sin asignaciones elimina', async () => {
    repo.findById.mockResolvedValue(challengeRow());
    repo.hasAssignments.mockResolvedValue(false);
    await challenges.deleteChallenge(TRAINER, 'ch-1');
    expect(repo.remove).toHaveBeenCalledWith('ch-1');
  });
});
