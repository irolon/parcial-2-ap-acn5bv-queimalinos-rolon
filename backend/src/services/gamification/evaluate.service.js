import { evaluateCriteria } from '../../models/gamification/criteria.js';
import { localDate } from '../../shared/utils/dates/dates.js';
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
 * `catalog` opcional: catálogo ya cargado (el job diario lo trae una vez por corrida).
 * Devuelve { unlocked: [{ code, name, category }], streak } con solo lo recién desbloqueado.
 */
export async function evaluateStudent(studentId, { now = new Date(), catalog: preloaded } = {}) {
  const [closed, assignedDays, catalog, unlockedIds] = await Promise.all([
    dataRepo.findClosedSessions(studentId),
    dataRepo.findAssignedDays(studentId),
    preloaded ?? gamificationRepo.findCatalog(),
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
  const inserted = new Set();
  const grantReward = async (achievementId, challengeId) => {
    if (known.has(achievementId)) return;
    const done = await gamificationRepo.insertUnlocked([
      { student_id: studentId, achievement_id: achievementId, context: { challenge_id: challengeId } },
    ]);
    known.add(achievementId);
    for (const r of done) inserted.add(r.achievement_id);
  };
  // Aislado: si los desafíos fallan, los logros comunes igual se insertan.
  try {
    await updateActiveChallenges(studentId, { closed, assignedDays, now, grantReward });
  } catch (err) {
    console.error('[gamification] desafíos', err);
  }

  for (const r of await gamificationRepo.insertUnlocked(rows)) inserted.add(r.achievement_id);
  const unlocked = catalog
    .filter((a) => inserted.has(a.id))
    .map(({ code, name, category }) => ({ code, name, category }));
  return { unlocked, streak };
}
