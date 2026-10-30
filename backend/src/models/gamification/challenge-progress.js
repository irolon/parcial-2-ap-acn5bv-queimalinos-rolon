/**
 * Progreso de un desafío según su tipo de meta. Función pura.
 * `facts`: sessionsInWindow, volumeInWindow, bestStreakInWindow (ventana
 * started_at–ends_at) y startWeight / lastWeight (weight_target).
 */

const round1 = (n) => Math.round(n * 10) / 10;
const clampPct = (n) => round1(Math.min(100, Math.max(0, n)));

const COUNTERS = {
  sessions_count: 'sessionsInWindow',
  volume: 'volumeInWindow',
  streak: 'bestStreakInWindow',
};

function weightProgress(goal, { startWeight, lastWeight }) {
  if (startWeight == null || lastWeight == null) {
    return { current_progress: 0, progress_pct: 0, reached: false };
  }
  const start = Number(startWeight);
  const last = Number(lastWeight);
  if (start === goal) return { current_progress: last, progress_pct: 100, reached: true };
  // Dirección inferida del peso inicial: bajar (start > goal) o subir (start < goal).
  const reached = start > goal ? last <= goal : last >= goal;
  return {
    current_progress: last,
    progress_pct: clampPct(((start - last) / (start - goal)) * 100),
    reached,
  };
}

export function challengeProgress({ goal_type: goalType, goal_value: goalValue }, facts) {
  const goal = Number(goalValue);
  if (goalType === 'weight_target') return weightProgress(goal, facts);
  const current = Number(facts[COUNTERS[goalType]] ?? 0);
  return {
    current_progress: current,
    progress_pct: goal > 0 ? clampPct((current / goal) * 100) : 0,
    reached: current >= goal,
  };
}
