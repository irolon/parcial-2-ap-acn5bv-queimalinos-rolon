import { evaluateCriteria } from '../../models/gamification/criteria.js';
import { localDate } from '../../shared/utils/dates.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import * as dataRepo from '../../repositories/gamification/evaluate-data.repository.js';
import { fetchSessionRecords } from '../../repositories/sessions/session-history.repository.js';
import { buildFacts, contextFor } from './evaluate-facts.js';
import { updateActiveChallenges } from './evaluate-challenges.js';

const RECORDS_CHUNK = 1000;

/** Récords de las sesiones cerradas, en lotes de hasta 1000 ids. */
async function fetchRecordPairs(studentId, sessionIds) {
  const pairs = [];
  for (let i = 0; i < sessionIds.length; i += RECORDS_CHUNK) {
    pairs.push(...(await fetchSessionRecords(studentId, sessionIds.slice(i, i + RECORDS_CHUNK))));
  }
  return pairs;
}

/**
 * Evalúa al alumno desde su historial (idempotente): recalcula y guarda la racha,
 * otorga los logros cuya regla se cumple, actualiza los desafíos activos y
 * otorga el logro premio de los completados.
 * Devuelve { unlocked: [{ code, name, category }], streak } con solo lo recién desbloqueado.
 */
export async function evaluateStudent(studentId, { now = new Date() } = {}) {
  const [closed, assignedDays, catalog, unlockedIds] = await Promise.all([
    dataRepo.findClosedSessions(studentId),
    dataRepo.findAssignedDays(studentId),
    gamificationRepo.findCatalog(),
    gamificationRepo.findUnlockedAchievementIds(studentId),
  ]);
  const recordPairs = closed.length ? await fetchRecordPairs(studentId, closed.map((s) => s.id)) : [];
  const { facts, streak, recordSessions } = buildFacts({
    closed,
    assignedDays,
    recordPairs,
    today: localDate(now),
  });

  await gamificationRepo.upsertStreak(studentId, streak);

  const known = new Set(unlockedIds);
  const rows = [];
  const push = (achievementId, context) => {
    if (known.has(achievementId)) return;
    known.add(achievementId);
    rows.push({ student_id: studentId, achievement_id: achievementId, context });
  };
  if (closed.length) {
    for (const achievement of evaluateCriteria(catalog, facts)) {
      push(achievement.id, contextFor(achievement.criteria, { closed, recordSessions }));
    }
  }
  const rewards = await updateActiveChallenges(studentId, { closed, assignedDays, now });
  for (const reward of rewards) push(reward.achievement_id, { challenge_id: reward.challenge_id });

  const inserted = new Set((await gamificationRepo.insertUnlocked(rows)).map((r) => r.achievement_id));
  const unlocked = catalog
    .filter((a) => inserted.has(a.id))
    .map(({ code, name, category }) => ({ code, name, category }));
  return { unlocked, streak };
}
