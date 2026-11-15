import * as overviewRepo from '../../repositories/students/overview.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository/students.repository.js';
import { findOpenSessions } from '../../repositories/sessions/open-sessions.repository.js';
import { openSince } from '../../models/sessions/session.model.js';
import { buildOverview } from '../../models/students/overview.js';
import { attachAvatars } from '../../models/students/overview-avatars.js';
import { signAvatars } from './avatar-urls.service.js';
import { dailySessions } from '../../models/students/overview-daily.js';
import { addDays } from '../../models/gamification/streak.js';
import { localDate } from '../../shared/utils/dates/dates.js';

export const RECENT_LIMIT = 10;

/** Ventana de sesiones: hoy y los 30 días anteriores: el gráfico; la adherencia y las listas recortan la suya. */
const WINDOW_DAYS = 30;

/** Sin alumnos activos: todo vacío y el gráfico en 0 (se arma con hoy, por eso es función). */
const empty = (today) => ({
  active_students: { count: 0, new_7d: 0 },
  sessions_today: { done: 0, expected: 0 },
  adherence_7d: { pct: null, delta: null },
  at_risk: 0,
  attention: [],
  recent: [],
  in_session: [],
  lists: { today: [], at_risk: [], feedback_pending: [], students: [] },
  daily: dailySessions([], today),
});

/**
 * GET /students/overview — Inicio del entrenador. Solo sus alumnos activos (los dados de baja no cuentan
 * en nada). Una consulta por lote para cada dato, sin N+1.
 */
export async function overview(trainerId) {
  const today = localDate();
  const students = await overviewRepo.findActiveStudents(trainerId);
  if (!students.length) return empty(today);

  const ids = students.map((s) => s.id);
  // Fotos firmadas en una sola llamada, en paralelo con el resto (best-effort: si Storage falla, salen null).
  const [signed, schedules, lastSessions, sessions, recent, open] = await Promise.all([
    signAvatars(students),
    studentsRepo.findActiveRoutineSchedules(ids),
    studentsRepo.findLastSessionDates(ids),
    overviewRepo.findFinishedSessionsSince(ids, `${addDays(today, -WINDOW_DAYS)}T00:00:00-03:00`),
    overviewRepo.findRecentFinished(ids, RECENT_LIMIT),
    findOpenSessions(ids, openSince()),
  ]);
  const avatarById = new Map(signed.map((s) => [s.id, s.avatar_url]));
  const lastById = new Map(lastSessions.map((r) => [r.student_id, r.last_session_at]));
  const result = buildOverview({
    // Sin avatar_url crudo (ruta del bucket): la foto firmada se agrega al final con attachAvatars.
    students: students.map(({ avatar_url: _raw, ...s }) => ({ ...s, active: true, last_session_at: lastById.get(s.id) ?? null })),
    routineDays: new Map([...schedules].map(([id, sc]) => [id, sc.days])),
    daySince: new Map([...schedules].map(([id, sc]) => [id, sc.daySince])),
    sessions,
    recent,
    open,
    today,
  });
  return attachAvatars(result, avatarById);
}
