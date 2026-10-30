/**
 * Evaluador genérico de logros: la regla es un dato (`achievements.criteria`)
 * y cada `type` se resuelve con una función de este mapa.
 * `facts = { sessionsCount, longestStreak, prSessions, fullWeeks }`.
 */

export const CRITERIA = {
  sessions_count: (criteria, facts) => facts.sessionsCount >= criteria.value,
  streak: (criteria, facts) => facts.longestStreak >= criteria.days,
  pr_count: (criteria, facts) => facts.prSessions >= criteria.value,
  full_week: (criteria, facts) => facts.fullWeeks >= criteria.count,
  // Lo otorga el desafío que lo premia, nunca el evaluador.
  challenge: () => false,
};

/** ¿Se cumple el criterio? Un tipo desconocido (o criterio vacío) nunca se cumple. */
export function meetsCriteria(criteria, facts) {
  const check = CRITERIA[criteria?.type];
  return check ? Boolean(check(criteria, facts)) : false;
}

/** Los logros del catálogo cuya regla se cumple con estos datos. */
export const evaluateCriteria = (achievements, facts) =>
  achievements.filter((achievement) => meetsCriteria(achievement.criteria, facts));
