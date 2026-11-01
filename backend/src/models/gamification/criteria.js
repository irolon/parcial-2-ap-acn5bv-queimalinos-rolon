/**
 * Evaluador genérico de logros: la regla es un dato (`achievements.criteria`)
 * y cada `type` se resuelve con una entrada de este mapa.
 * `facts = { sessionsCount, longestStreak, prSessions, fullWeeks }`.
 * La misma tabla la usa el progreso (achievement-progress.js): no hay otra copia de las reglas.
 */

// Por tipo: de dónde sale la meta en el jsonb y qué dato de `facts` la mide.
export const CRITERIA = {
  sessions_count: { goal: (c) => c.value, fact: 'sessionsCount' },
  streak: { goal: (c) => c.days, fact: 'longestStreak' },
  pr_count: { goal: (c) => c.value, fact: 'prSessions' },
  full_week: { goal: (c) => c.count, fact: 'fullWeeks' },
  // Lo otorga el desafío que lo premia, nunca el evaluador: no tiene meta.
  challenge: null,
};

/**
 * `{ goal, fact }` del criterio, o `null` si no se puede evaluar: tipo desconocido, `challenge`,
 * criterio vacío o meta que no es un número mayor a 0 (un seed mal cargado nunca regala el logro).
 */
export function criteriaGoal(criteria) {
  const rule = CRITERIA[criteria?.type];
  if (!rule) return null;
  const goal = Number(rule.goal(criteria));
  return Number.isFinite(goal) && goal > 0 ? { goal, fact: rule.fact } : null;
}

/** El dato que mide la meta; si falta, cuenta como 0. */
export const factValue = (facts, fact) => Number(facts?.[fact] ?? 0);

/** ¿Se cumple el criterio? Uno sin meta válida (ver criteriaGoal) nunca se cumple. */
export function meetsCriteria(criteria, facts) {
  const rule = criteriaGoal(criteria);
  return rule ? factValue(facts, rule.fact) >= rule.goal : false;
}

/** Los logros del catálogo cuya regla se cumple con estos datos. */
export const evaluateCriteria = (achievements, facts) =>
  achievements.filter((achievement) => meetsCriteria(achievement.criteria, facts));
