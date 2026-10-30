import { computeStreak, countFullWeeks } from '../../models/gamification/streak.js';
import { localDate } from '../../shared/utils/dates.js';

/**
 * Datos del evaluador a partir del historial (puro).
 * - closed: sesiones cerradas { id, started_at } ordenadas por started_at.
 * - recordPairs: pares { session_id, exercise_id } de session_records.
 * Devuelve los `facts` de criteria.js, la racha y los récords por sesión
 * (la más vieja primero), que sirven para armar el `context` de cada logro.
 */
export function buildFacts({ closed, assignedDays, recordPairs, today }) {
  const trainedDates = [...new Set(closed.map((s) => localDate(s.started_at)))];
  const streak = computeStreak({ trainedDates, assignedDays, today });
  const fullWeeks = countFullWeeks({ trainedDates, assignedDays, today });

  const firstExercise = new Map();
  for (const pair of recordPairs) {
    if (!firstExercise.has(pair.session_id)) firstExercise.set(pair.session_id, pair.exercise_id);
  }
  const recordSessions = closed
    .filter((s) => firstExercise.has(s.id))
    .map((s) => ({ session_id: s.id, exercise_id: firstExercise.get(s.id) }));

  return {
    facts: {
      sessionsCount: closed.length,
      longestStreak: streak.longest_days,
      prSessions: recordSessions.length,
      fullWeeks,
    },
    streak,
    recordSessions,
  };
}

/** `context` del desbloqueo (spec Q11) según el tipo de criterio. */
export function contextFor(criteria, { closed, recordSessions }) {
  const latest = closed[closed.length - 1];
  if (criteria.type === 'sessions_count') return { session_id: closed[criteria.value - 1]?.id ?? latest.id };
  if (criteria.type === 'pr_count') return recordSessions[criteria.value - 1] ?? recordSessions[0];
  return { session_id: latest.id };
}
