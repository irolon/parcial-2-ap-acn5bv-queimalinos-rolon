import { assertCanAccessStudent } from '../../students/student-access.service.js';
import * as gamificationRepo from '../../../repositories/gamification/gamification.repository.js';
import { achievementProgress } from '../../../models/gamification/achievement-progress.js';
import { toStreakView } from '../../../models/gamification/streak.js';
import { buildFacts } from '../evaluate-facts.js';
import { loadEvaluationInput } from '../evaluation-input.js';

/**
 * Racha, datos y progreso de cada logro del catálogo (spec tarjeta 15 §2). Solo lee: a diferencia de
 * evaluateStudent no guarda la racha ni otorga logros. La racha se calcula ahora, coherente con `facts`.
 * Incluye `assigned_days`: los días asignados con los que se calculó la racha.
 */
export async function getAchievementsProgress(user, studentId, { now = new Date() } = {}) {
  await assertCanAccessStudent(user, studentId);
  const [input, catalog, unlockedRows] = await Promise.all([
    loadEvaluationInput(studentId, now),
    gamificationRepo.findCatalog(),
    gamificationRepo.findUnlockedAt(studentId),
  ]);
  const { facts, streak } = buildFacts(input);
  const unlockedAt = new Map(unlockedRows.map((row) => [row.achievement_id, row.unlocked_at]));
  return {
    streak: toStreakView(streak),
    facts: {
      sessions_count: facts.sessionsCount,
      longest_streak: facts.longestStreak,
      pr_sessions: facts.prSessions,
      full_weeks: facts.fullWeeks,
    },
    assigned_days: input.assignedDays,
    achievements: catalog.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      category: a.category,
      icon_url: a.icon_url,
      criteria_type: a.criteria?.type ?? null,
      ...achievementProgress(a.criteria, facts, unlockedAt.has(a.id)),
      unlocked_at: unlockedAt.get(a.id) ?? null,
    })),
  };
}
