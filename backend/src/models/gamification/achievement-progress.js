/**
 * Progreso de un logro del catálogo para GET /students/:id/achievements/progress. Función pura.
 * `facts` = los de criteria.js: { sessionsCount, longestStreak, prSessions, fullWeeks }.
 */
import { criteriaGoal, factValue } from './criteria.js';

/**
 * `{ current, target }`, con `current` recortado a `target`. Un logro desbloqueado vale `target` aunque el
 * dato haya bajado (p. ej. cambió la rutina). Uno sin meta válida según criteriaGoal (`challenge`, tipo
 * desconocido o meta que no es mayor a 0) tiene meta 1: vale 1 solo si está desbloqueado.
 */
export function achievementProgress(criteria, facts, unlocked) {
  const rule = criteriaGoal(criteria);
  const target = rule ? rule.goal : 1;
  if (unlocked) return { current: target, target };
  if (!rule) return { current: 0, target };
  return { current: Math.min(target, factValue(facts, rule.fact)), target };
}
