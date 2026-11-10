/**
 * Resumen del historial de entrenamiento del alumno para la IA del entrenador.
 * Función pura: recibe lo ya leído de la base y no hace I/O.
 */
import { HISTORY_DAYS, HISTORY_EXERCISES } from './ai-generation.model.js';
import { DAY_MS, localDate } from '../../shared/utils/dates/dates.js';

/** Días de Argentina entre dos instantes (como rachas y semanas): el lunes 23:00 y el martes 08:00 están a 1 día. */
const argDaysBetween = (from, to) => Math.round((Date.parse(localDate(to)) - Date.parse(localDate(from))) / DAY_MS);

/**
 * Sesiones por semana desde la primera sesión de la ventana (mínimo 1 semana, máximo la ventana): un alumno que
 * empezó hace una semana con 3 sesiones da 3, no 0,8, y la IA no avisa de una frecuencia baja que no es tal.
 */
function sessionsPerWeek(sessions, now) {
  const firstFinished = Math.min(...sessions.map((s) => new Date(s.finished_at).getTime()));
  const spanDays = Math.min(HISTORY_DAYS, Math.max(7, (now.getTime() - firstFinished) / DAY_MS));
  return round1(sessions.length / (spanDays / 7));
}

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
    sessions_per_week: sessionsPerWeek(sessions, now),
    days_since_last_session: Math.max(0, argDaysBetween(lastFinished, now)),
    avg_rpe: rpes.length > 0 ? round1(rpes.reduce((a, b) => a + b, 0) / rpes.length) : null,
    exercises: summarizeExercises({ sets, exercisesById, lastKgById }),
  };
}
