/**
 * Resumen del historial de entrenamiento del alumno para la IA del entrenador.
 * Función pura: recibe lo ya leído de la base y no hace I/O.
 */
import { HISTORY_DAYS, HISTORY_EXERCISES } from './ai-generation.model.js';

const DAY_MS = 86_400_000;

/** Redondea a un decimal. */
const round1 = (n) => Math.round(n * 10) / 10;

/** Número o null: la base devuelve los numeric de Postgres como string. */
const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Mejor serie: la de más kilos (a igualdad, más reps); sin kilos, la de más reps. */
function bestSet(sets) {
  return sets.reduce((best, s) => {
    const kg = toNumber(s.actual_kg);
    const reps = toNumber(s.actual_reps) ?? 0;
    if (!best) return { kg, reps };
    const better =
      kg !== null && best.kg !== null
        ? kg > best.kg || (kg === best.kg && reps > best.reps)
        : kg !== null || (best.kg === null && reps > best.reps);
    return better ? { kg, reps } : best;
  }, null);
}

function summarizeExercises({ sets, exercisesById, lastKgById }) {
  const byExercise = new Map();
  for (const s of sets) {
    if (!s.completed || !s.exercise_id || !exercisesById.has(s.exercise_id)) continue;
    if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
    byExercise.get(s.exercise_id).push(s);
  }
  return [...byExercise.entries()]
    .map(([exerciseId, rows]) => {
      const { name, muscle_group } = exercisesById.get(exerciseId);
      return {
        exercise_id: exerciseId,
        exercise_name: name,
        muscle_group,
        sessions: new Set(rows.map((r) => r.session_id)).size,
        best_set: bestSet(rows),
        last_kg: toNumber(lastKgById[exerciseId]),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || a.exercise_name.localeCompare(b.exercise_name, 'es'))
    .slice(0, HISTORY_EXERCISES);
}

/**
 * @param {{ sessions: Array<{id, finished_at, rpe}>, sets: Array, exercisesById: Map, lastKgById: object, now: Date }} input
 */
export function summarizeHistory({ sessions, sets, exercisesById, lastKgById, now }) {
  if (sessions.length === 0) {
    return { sessions_per_week: 0, days_since_last_session: null, avg_rpe: null, exercises: [] };
  }
  const lastFinished = Math.max(...sessions.map((s) => new Date(s.finished_at).getTime()));
  const rpes = sessions.map((s) => toNumber(s.rpe)).filter((r) => r !== null);
  return {
    sessions_per_week: round1(sessions.length / (HISTORY_DAYS / 7)),
    days_since_last_session: Math.max(0, Math.floor((now.getTime() - lastFinished) / DAY_MS)),
    avg_rpe: rpes.length > 0 ? round1(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null,
    exercises: summarizeExercises({ sets, exercisesById, lastKgById }),
  };
}
