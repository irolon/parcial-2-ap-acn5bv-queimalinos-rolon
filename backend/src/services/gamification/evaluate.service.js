import { evaluateCriteria } from '../../models/gamification/criteria.js';
import * as gamificationRepo from '../../repositories/gamification/gamification.repository.js';
import { buildFacts, contextFor } from './evaluate-facts.js';
import { updateActiveChallenges } from './evaluate-challenges.js';
import { loadEvaluationInput } from './evaluation-input.js';

/**
 * Evalúa al alumno desde su historial (idempotente): recalcula y guarda la racha,
 * otorga los logros cuya regla se cumple, actualiza los desafíos activos y
 * otorga el logro premio de los completados.
 * `catalog` opcional: catálogo ya cargado (el job diario lo trae una vez por corrida).
 * Devuelve { unlocked: [{ code, name, category }], streak } con solo lo recién desbloqueado.
 */
export async function evaluateStudent(studentId, { now = new Date(), catalog: preloaded } = {}) {
  const [input, catalog, unlockedIds] = await Promise.all([
    loadEvaluationInput(studentId, now),
    preloaded ?? gamificationRepo.findCatalog(),
    gamificationRepo.findUnlockedAchievementIds(studentId),
  ]);
  const { closed, assignedDays } = input;
  const { facts, streak, recordSessions } = buildFacts(input);

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
