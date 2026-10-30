import { Errors, CHALLENGE_ALREADY_ACTIVE } from '../../shared/utils/errors.js';
import { DAY_MS } from '../../shared/utils/dates.js';
import * as studentChallengesRepo from '../../repositories/gamification/student-challenges.repository.js';
import * as dataRepo from '../../repositories/gamification/evaluate-data.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import { getVisibleChallenge } from './challenges.service.js';
import { weightFacts } from './evaluate-challenges.js';
import { challengeProgress, counterFacts } from '../../models/gamification/challenge-progress.js';
import { CHALLENGE_STATUS, GOAL_TYPE } from '../../models/gamification/gamification.model.js';

/**
 * Forma pública de una asignación. El porcentaje sale de `challengeProgress`;
 * `weights` (mediciones del alumno) solo hace falta para weight_target.
 * Un desafío completado siempre vale 100.
 */
export function toAssignmentView(row, weights = []) {
  const { challenge } = row;
  const goal = Number(challenge.goal_value);
  const current = Number(row.current_progress);
  const facts =
    challenge.goal_type === GOAL_TYPE.WEIGHT_TARGET
      ? weightFacts(weights, row.started_at, row.ends_at, new Date())
      : counterFacts(current);
  const completed = row.status === CHALLENGE_STATUS.COMPLETED;
  return {
    id: row.id,
    challenge: {
      id: challenge.id,
      name: challenge.name,
      description: challenge.description,
      goal_type: challenge.goal_type,
      goal_value: goal,
      duration_days: challenge.duration_days,
      reward_achievement_id: challenge.reward_achievement_id,
    },
    started_at: row.started_at,
    ends_at: row.ends_at,
    current_progress: current,
    goal_value: goal,
    progress_pct: completed ? 100 : challengeProgress(challenge, facts).progress_pct,
    status: row.status,
    completed_at: row.completed_at,
  };
}

/** Asignaciones del alumno, la más nueva primero. */
export async function listForStudent(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  const rows = await studentChallengesRepo.findByStudent(studentId);
  const needsWeights = rows.some((r) => r.challenge.goal_type === GOAL_TYPE.WEIGHT_TARGET);
  const weights = needsWeights ? await dataRepo.findWeights(studentId) : [];
  return rows.map((row) => toAssignmentView(row, weights));
}

async function createAssignment(studentId, challenge) {
  if (!challenge.duration_days) {
    throw Errors.validation('Error de validación', [
      { field: 'challenge_id', message: 'El desafío no tiene duración definida' },
    ]);
  }
  const now = new Date();
  const row = await studentChallengesRepo.insertAssignment({
    student_id: studentId,
    challenge_id: challenge.id,
    started_at: now.toISOString(),
    ends_at: new Date(now.getTime() + challenge.duration_days * DAY_MS).toISOString(),
  });
  return toAssignmentView(row);
}

/** El trainer dueño o el propio alumno toman un desafío visible. */
export async function assignToStudent(user, studentId, challengeId) {
  const student = await assertCanAccessStudent(user, studentId);
  const challenge = await getVisibleChallenge(challengeId, student.trainer_id);
  return createAssignment(studentId, challenge);
}

/** Asigna en lote: los que no son alumnos activos o ya lo tienen van a `skipped`. */
export async function assignToMany(user, challengeId, studentIds) {
  const challenge = await getVisibleChallenge(challengeId, user.id);
  const mine = new Set(await studentChallengesRepo.findActiveStudentIds(user.id, studentIds));
  const created = [];
  const skipped = [];
  for (const studentId of studentIds) {
    if (!mine.has(studentId)) {
      skipped.push({ student_id: studentId, reason: 'not_your_student' });
      continue;
    }
    try {
      created.push(await createAssignment(studentId, challenge));
    } catch (err) {
      if (err.code !== CHALLENGE_ALREADY_ACTIVE) throw err;
      skipped.push({ student_id: studentId, reason: 'already_active' });
    }
  }
  return { created, skipped };
}
