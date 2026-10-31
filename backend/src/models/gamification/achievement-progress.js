/**
 * Progreso de un logro del catálogo para GET /students/:id/achievements/progress. Función pura.
 * `facts` = los de criteria.js: { sessionsCount, longestStreak, prSessions, fullWeeks }.
 */

// Por tipo de criterio: de dónde sale la meta y qué dato la mide (las mismas reglas que criteria.js).
const RULES = {
  sessions_count: { target: (c) => c.value, fact: 'sessionsCount' },
  streak: { target: (c) => c.days, fact: 'longestStreak' },
  pr_count: { target: (c) => c.value, fact: 'prSessions' },
  full_week: { target: (c) => c.count, fact: 'fullWeeks' },
};

/**
 * `{ current, target }`, con `current` recortado a `target`. Un logro desbloqueado vale `target` aunque el
 * dato haya bajado (p. ej. cambió la rutina). `challenge` (lo otorga un desafío), un tipo desconocido o una
 * meta inválida tienen meta 1: valen 1 solo si están desbloqueados.
 */
export function achievementProgress(criteria, facts, unlocked) {
  const rule = RULES[criteria?.type];
  const goal = rule ? Number(rule.target(criteria)) : NaN;
  const valid = goal > 0;
  const target = valid ? goal : 1;
  if (unlocked) return { current: target, target };
  if (!valid) return { current: 0, target };
  return { current: Math.min(target, Number(facts?.[rule.fact] ?? 0)), target };
}
