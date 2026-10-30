import { Errors } from '../../shared/utils/errors.js';
import * as challengesRepo from '../../repositories/gamification/challenges.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';

/** Desafío visible para ese entrenador (global o suyo); si no, 404. */
export async function getVisibleChallenge(challengeId, trainerId) {
  const challenge = await challengesRepo.findById(challengeId);
  if (!challenge || (challenge.trainer_id !== null && challenge.trainer_id !== trainerId)) {
    throw Errors.challengeNotFound();
  }
  return challenge;
}

/** Desafío propio del entrenador; global, ajeno o inexistente → 404. */
async function getOwnedChallenge(challengeId, trainerId) {
  const challenge = await challengesRepo.findById(challengeId);
  if (!challenge || challenge.trainer_id !== trainerId) throw Errors.challengeNotFound();
  return challenge;
}

async function assertRewardExists(rewardId) {
  if (rewardId && !(await challengesRepo.achievementExists(rewardId))) {
    throw Errors.validation('Error de validación', [
      { field: 'reward_achievement_id', message: 'El logro no existe' },
    ]);
  }
}

/** Listado: trainer → globales + propios; alumno → globales + los de su entrenador. */
export async function listChallenges(user, { goal_type: goalType } = {}) {
  let trainerId = user.id;
  if (user.role === 'student') trainerId = (await assertCanAccessStudent(user, user.id)).trainer_id;
  return challengesRepo.findVisible(trainerId, goalType);
}

export async function createChallenge(user, fields) {
  await assertRewardExists(fields.reward_achievement_id);
  return challengesRepo.insert({ ...fields, trainer_id: user.id });
}

export async function updateChallenge(user, challengeId, fields) {
  const current = await getOwnedChallenge(challengeId, user.id);
  await assertRewardExists(fields.reward_achievement_id);
  const goalChanged =
    (fields.goal_type !== undefined && fields.goal_type !== current.goal_type) ||
    (fields.goal_value !== undefined && Number(fields.goal_value) !== Number(current.goal_value));
  // Cambiar la meta recalcularía con otra vara a quienes ya lo están haciendo.
  if (goalChanged && (await challengesRepo.hasActiveAssignments(challengeId))) {
    throw Errors.challengeInUse('No se puede cambiar la meta de un desafío con asignaciones activas');
  }
  return challengesRepo.update(challengeId, fields);
}

export async function deleteChallenge(user, challengeId) {
  await getOwnedChallenge(challengeId, user.id);
  // Cualquier asignación (aun terminada) bloquea el borrado: el cascade perdería el historial.
  if (await challengesRepo.hasAssignments(challengeId)) throw Errors.challengeInUse();
  await challengesRepo.remove(challengeId);
}
