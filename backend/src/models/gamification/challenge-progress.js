/**
 * Progreso de un desafío según su tipo de meta. Función pura.
 * `facts`: sessionsInWindow, volumeInWindow, bestStreakInWindow (ventana
 * started_at–ends_at) y startWeight / lastWeight (weight_target).
 */

import { GOAL_TYPE } from './gamification.model.js';

const round1 = (n) => Math.round(n * 10) / 10;
// Sin alcanzar la meta nunca se muestra 100: 99.96 redondearía a 100.0.
const clampPct = (n, reached) => round1(Math.min(reached ? 100 : 99.9, Math.max(0, n)));

const NO_PROGRESS = { current_progress: 0, progress_pct: 0, reached: false };

const COUNTERS = {
  [GOAL_TYPE.SESSIONS_COUNT]: 'sessionsInWindow',
  [GOAL_TYPE.VOLUME]: 'volumeInWindow',
  [GOAL_TYPE.STREAK]: 'bestStreakInWindow',
};

/** Facts de un desafío por contador a partir de su `current_progress` ya guardado. */
export const counterFacts = (current) =>
  Object.fromEntries(Object.values(COUNTERS).map((key) => [key, current]));

function weightProgress(goal, { startWeight, lastWeight }) {
  if (startWeight == null || lastWeight == null) return { ...NO_PROGRESS };
  const start = Number(startWeight);
  const last = Number(lastWeight);
  if (start === goal) return { current_progress: last, progress_pct: 100, reached: true };
  // Dirección inferida del peso inicial: bajar (start > goal) o subir (start < goal).
  const reached = start > goal ? last <= goal : last >= goal;
  return {
    current_progress: last,
    progress_pct: clampPct(((start - last) / (start - goal)) * 100, reached),
    reached,
  };
}

export function challengeProgress({ goal_type: goalType, goal_value: goalValue }, facts) {
  const goal = Number(goalValue);
  const known = goalType === GOAL_TYPE.WEIGHT_TARGET || goalType in COUNTERS;
  // Tipo desconocido o meta inválida (solo posible por SQL directo): nunca se cumple.
  if (!known || !(goal > 0)) return { ...NO_PROGRESS };
  if (goalType === GOAL_TYPE.WEIGHT_TARGET) return weightProgress(goal, facts);
  const current = Number(facts[COUNTERS[goalType]] ?? 0);
  const reached = current >= goal;
  return {
    current_progress: current,
    progress_pct: clampPct((current / goal) * 100, reached),
    reached,
  };
}
