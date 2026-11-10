import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  challenges,
  mockChallenges as repo,
  TRAINER,
  challengeRow,
  resetMocks,
} from '../../../../helpers/gamification/challenges.setup.js';

beforeEach(resetMocks);

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

  it.each([
    ['solo goal_value con decimales en uno de sesiones', challengeRow(), { goal_value: 7.5 }],
    ['pasar a racha uno de volumen con meta decimal', challengeRow({ goal_type: 'volume', goal_value: 1500.5 }),
      { goal_type: 'streak' }],
  ])('PATCH parcial: %s → 400 y no actualiza', async (_n, row, fields) => {
    repo.findById.mockResolvedValue(row);
    repo.hasActiveAssignments.mockResolvedValue(false);
    await expect(challenges.updateChallenge(TRAINER, 'ch-1', fields)).rejects.toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('PATCH parcial: decimales en uno de volumen pasa', async () => {
    repo.findById.mockResolvedValue(challengeRow({ goal_type: 'volume', goal_value: '1500' }));
    repo.hasActiveAssignments.mockResolvedValue(false);
    repo.update.mockResolvedValue(challengeRow());
    await challenges.updateChallenge(TRAINER, 'ch-1', { goal_value: 1500.5 });
    expect(repo.update).toHaveBeenCalledWith('ch-1', { goal_value: 1500.5 });
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

describe('aislamiento: desafío ajeno, global o inexistente', () => {
  const NOT_FOUND = { statusCode: 404, code: 'CHALLENGE_NOT_FOUND' };

  it.each([
    ['ajeno', 'otro-tr'],
    ['global', null],
  ])('PATCH sobre desafío %s → 404 CHALLENGE_NOT_FOUND sin actualizar', async (_n, trainer_id) => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id }));
    await expect(challenges.updateChallenge(TRAINER, 'ch-1', { name: 'X' })).rejects.toMatchObject(
      NOT_FOUND
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it.each([
    ['ajeno', 'otro-tr'],
    ['global', null],
  ])('DELETE sobre desafío %s → 404 CHALLENGE_NOT_FOUND sin borrar', async (_n, trainer_id) => {
    repo.findById.mockResolvedValue(challengeRow({ trainer_id }));
    await expect(challenges.deleteChallenge(TRAINER, 'ch-1')).rejects.toMatchObject(NOT_FOUND);
    expect(repo.hasAssignments).not.toHaveBeenCalled();
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('PATCH y DELETE de un desafío inexistente → 404', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(challenges.updateChallenge(TRAINER, 'ch-x', { name: 'X' })).rejects.toMatchObject(
      NOT_FOUND
    );
    await expect(challenges.deleteChallenge(TRAINER, 'ch-x')).rejects.toMatchObject(NOT_FOUND);
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
