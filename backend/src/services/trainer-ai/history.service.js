import { HISTORY_DAYS } from '../../models/trainer-ai/ai-generation.model.js';
import { summarizeHistory } from '../../models/trainer-ai/student-history.model.js';
import { findFinishedSessionsSince } from '../../repositories/trainer-ai/ai-history.repository.js';
import { findSetsForSessions } from '../../repositories/sessions/session-history.repository.js';
import { fetchLastSessionKg } from '../../repositories/progress/progress.repository.js';
import { findExercisesByIds } from '../../repositories/routine-templates/routine-templates.repository.js';

const DAY_MS = 86_400_000;

/**
 * Resumen del entrenamiento del alumno en los últimos HISTORY_DAYS días, para el contexto de la IA.
 * Lee en lote: sesiones, series de esas sesiones, ejercicios y última carga de los ejercicios hechos.
 */
export async function buildStudentHistory(studentId, now = new Date()) {
  const since = new Date(now.getTime() - HISTORY_DAYS * DAY_MS).toISOString();
  const sessions = await findFinishedSessionsSince(studentId, since);
  const summarize = (sets, exercisesById = new Map(), lastKgById = {}) =>
    summarizeHistory({ sessions, sets, exercisesById, lastKgById, now });
  if (sessions.length === 0) return summarize([]);

  const sets = await findSetsForSessions(sessions.map((s) => s.id));
  const exerciseIds = [...new Set(sets.filter((s) => s.completed && s.exercise_id).map((s) => s.exercise_id))];
  if (exerciseIds.length === 0) return summarize(sets);

  const [exercises, lastKgById] = await Promise.all([
    findExercisesByIds(exerciseIds),
    fetchLastSessionKg(studentId, exerciseIds),
  ]);
  const exercisesById = new Map(exercises.map((e) => [e.id, { name: e.name, muscle_group: e.muscle_group }]));
  return summarize(sets, exercisesById, lastKgById);
}
