import { challengeProgress } from '../../models/gamification/challenge-progress.js';
import { computeStreak } from '../../models/gamification/streak.js';
import { CHALLENGE_STATUS } from '../../models/gamification/gamification.model.js';
import { localDate } from '../../shared/utils/dates.js';
import * as dataRepo from '../../repositories/gamification/evaluate-data.repository.js';

const ms = (value) => new Date(value).getTime();

/** Pesos de la ventana: inicial = último <= started_at (si no, el primero dentro) y final = último <= now. */
function weightFacts(weights, startedAt, endsAt, now) {
  const upTo = (limit) => weights.filter((w) => ms(w.recorded_at) <= limit);
  const before = upTo(ms(startedAt));
  const inWindow = upTo(Math.min(ms(now), ms(endsAt))).filter((w) => ms(w.recorded_at) >= ms(startedAt));
  const start = before.length ? before[before.length - 1] : inWindow[0];
  const last = inWindow.length ? inWindow[inWindow.length - 1] : before[before.length - 1];
  return { startWeight: start?.weight_kg ?? null, lastWeight: last?.weight_kg ?? null };
}

/** Facts de una asignación dentro de [started_at, ends_at]. */
async function windowFacts(assignment, { closed, assignedDays, now, weights }) {
  const { started_at: startedAt, ends_at: endsAt, challenge } = assignment;
  const inWindow = closed.filter((s) => ms(s.started_at) >= ms(startedAt) && ms(s.started_at) <= ms(endsAt));
  const facts = { sessionsInWindow: inWindow.length };

  if (challenge.goal_type === 'volume') {
    const sets = inWindow.length ? await dataRepo.findCompletedSets(inWindow.map((s) => s.id)) : [];
    facts.volumeInWindow = sets.reduce((sum, s) => sum + (s.actual_reps ?? 0) * Number(s.actual_kg ?? 0), 0);
  }
  if (challenge.goal_type === 'streak') {
    const endDate = localDate(endsAt);
    const nowDate = localDate(now);
    const { longest_days: best } = computeStreak({
      trainedDates: [...new Set(inWindow.map((s) => localDate(s.started_at)))],
      assignedDays,
      today: endDate < nowDate ? endDate : nowDate,
    });
    facts.bestStreakInWindow = best;
  }
  if (challenge.goal_type === 'weight_target') Object.assign(facts, weightFacts(weights, startedAt, endsAt, now));
  return facts;
}

/**
 * Actualiza el progreso de las asignaciones activas del alumno; las que llegan a
 * la meta pasan a `completed`. Nunca marca `failed` (eso es del cron).
 * El premio se otorga (`grantReward`, idempotente) ANTES de marcar completed: si
 * falla, la asignación sigue activa y la próxima corrida reintenta.
 */
export async function updateActiveChallenges(studentId, { closed, assignedDays, now, grantReward }) {
  const assignments = await dataRepo.findActiveAssignments(studentId);
  if (assignments.length === 0) return;
  const needsWeights = assignments.some((a) => a.challenge.goal_type === 'weight_target');
  const weights = needsWeights ? await dataRepo.findWeights(studentId) : [];

  for (const assignment of assignments) {
    const facts = await windowFacts(assignment, { closed, assignedDays, now, weights });
    const progress = challengeProgress(assignment.challenge, facts);
    const fields = { current_progress: progress.current_progress };
    if (progress.reached) {
      const reward = assignment.challenge.reward_achievement_id;
      if (reward) await grantReward(reward, assignment.challenge_id);
      Object.assign(fields, { status: CHALLENGE_STATUS.COMPLETED, completed_at: new Date(now).toISOString() });
    }
    await dataRepo.updateAssignment(assignment.id, fields);
  }
}
