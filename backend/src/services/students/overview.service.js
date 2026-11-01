import * as overviewRepo from '../../repositories/students/overview.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { buildOverview } from '../../models/students/overview.js';
import { addDays } from '../../models/gamification/streak.js';
import { localDate } from '../../shared/utils/dates.js';

export const RECENT_LIMIT = 10;

/** Ventana de sesiones: hoy y los 14 días anteriores (las dos semanas de la adherencia). */
const WINDOW_DAYS = 14;

const EMPTY = {
  active_students: { count: 0, new_7d: 0 },
  sessions_today: { done: 0, expected: 0 },
  adherence_7d: { pct: null, delta: null },
  at_risk: 0,
  attention: [],
  recent: [],
};

/**
 * GET /students/overview — Inicio del entrenador. Solo sus alumnos activos (los dados de baja no cuentan
 * en nada). Una consulta por lote para cada dato, sin N+1.
 */
export async function overview(trainerId) {
  const students = await overviewRepo.findActiveStudents(trainerId);
  if (!students.length) return EMPTY;

  const ids = students.map((s) => s.id);
  const today = localDate();
  const [schedules, lastSessions, sessions, recent] = await Promise.all([
    studentsRepo.findActiveRoutineSchedules(ids),
    studentsRepo.findLastSessionDates(ids),
    overviewRepo.findFinishedSessionsSince(ids, `${addDays(today, -WINDOW_DAYS)}T00:00:00-03:00`),
    overviewRepo.findRecentFinished(ids, RECENT_LIMIT),
  ]);
  const lastById = new Map(lastSessions.map((r) => [r.student_id, r.last_session_at]));
  return buildOverview({
    students: students.map((s) => ({ ...s, active: true, last_session_at: lastById.get(s.id) ?? null })),
    routineDays: new Map([...schedules].map(([id, sc]) => [id, sc.days])),
    daySince: new Map([...schedules].map(([id, sc]) => [id, sc.daySince])),
    sessions,
    recent,
    today,
  });
}
