import { Errors } from '../../shared/utils/errors.js';
import * as studentChallengesRepo from '../../repositories/gamification/student-challenges.repository.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import { getVisibleChallenge } from './challenges.service.js';
import { CHALLENGE_STATUS } from '../../models/gamification/gamification.model.js';

const DAY_MS = 86_400_000;
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Forma pública de una asignación. weight_target no se calcula acá (necesita
 * las mediciones): progress_pct = 100 si está completado y null si no.
 */
export function toAssignmentView(row) {
  const { challenge } = row;
  const goal = Number(challenge.goal_value);
  const current = Number(row.current_progress);
  let progressPct = null;
  if (challenge.goal_type !== 'weight_target') {
    progressPct = goal > 0 ? round1(Math.min(100, (current / goal) * 100)) : 0;
  } else if (row.status === CHALLENGE_STATUS.COMPLETED) progressPct = 100;
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
    progress_pct: progressPct,
    status: row.status,
    completed_at: row.completed_at,
  };
}

/** Asignaciones del alumno, la más nueva primero. */
export async function listForStudent(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  return (await studentChallengesRepo.findByStudent(studentId)).map(toAssignmentView);
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
      if (err.code !== 'CHALLENGE_ALREADY_ACTIVE') throw err;
      skipped.push({ student_id: studentId, reason: 'already_active' });
    }
  }
  return { created, skipped };
}
