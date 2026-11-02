/**
 * Listas del Inicio del entrenador (GET /students/overview → `lists`), una por filtro de la app:
 * hoy, en riesgo, feedback pendiente y alumnos. Funciones puras, fechas en hora argentina.
 */
import { addDays, weekdayOf } from '../gamification/streak.js';
import { localDate } from '../../shared/utils/dates.js';
import { adherence7d } from './adherence.js';
import { activityStatus, daysWithoutTraining } from './activity.js';

/** "Feedback pendiente": sesiones terminadas en los últimos 7 días, contando hoy. */
export const FEEDBACK_WINDOW_DAYS = 7;

const byName = (a, b) => a.name.localeCompare(b.name, 'es');
const newestFirst = (a, b) => b.finished_at.localeCompare(a.finished_at);

const sessionFields = (s) => ({
  session_id: s.id, routine_name: s.routine_name ?? null, finished_at: s.finished_at, rpe: s.rpe ?? null,
});

/**
 * Los que tienen hoy asignado (planned) y los que entrenaron hoy sin tenerlo. status 'done' si terminaron
 * una sesión hoy (por la hora de fin; se muestra la última). Primero los pendientes por nombre, después
 * los terminados del más reciente.
 */
export function todayList(students, routineDays, sessions, today) {
  const weekday = weekdayOf(today);
  const lastToday = new Map();
  for (const s of sessions) {
    if (localDate(s.finished_at) !== today) continue;
    const prev = lastToday.get(s.student_id);
    if (!prev || s.finished_at > prev.finished_at) lastToday.set(s.student_id, s);
  }
  const rows = students
    .map((st) => ({ st, planned: (routineDays.get(st.id) ?? []).includes(weekday), session: lastToday.get(st.id) }))
    .filter((r) => r.planned || r.session)
    .map(({ st, planned, session }) => ({
      student_id: st.id, name: st.name, planned, status: session ? 'done' : 'pending',
      ...(session ? sessionFields(session) : { session_id: null, routine_name: null, finished_at: null, rpe: null }),
    }));
  const pending = rows.filter((r) => r.status === 'pending').sort(byName);
  const done = rows.filter((r) => r.status === 'done').sort(newestFirst);
  return [...pending, ...done];
}

/** Alumnos en riesgo (7 días o más sin entrenar), de más días a menos. */
export function riskList(students, today) {
  return students
    .filter((s) => activityStatus(s, today) === 'inactive')
    .map((s) => ({ student_id: s.id, name: s.name, days: daysWithoutTraining(s, today), never_trained: !s.last_session_at }))
    .sort((a, b) => b.days - a.days);
}

/** Sesiones de los últimos 7 días sin comentario del entrenador, de la más nueva a la más vieja. */
export function feedbackList(sessions, nameById, today) {
  const since = addDays(today, -(FEEDBACK_WINDOW_DAYS - 1));
  return sessions
    .filter((s) => !s.trainer_comment && localDate(s.finished_at) >= since)
    .sort(newestFirst)
    .map((s) => ({ student_id: s.student_id, name: nameById.get(s.student_id) ?? null, ...sessionFields(s) }));
}

/**
 * Todos los alumnos activos con su estado y adherencia de 7 días (null sin plan), por nombre. Con los mismos
 * pisos que GET /students y el KPI: alta del alumno y fecha de la rutina (daySince).
 */
export function studentsList(students, routineDays, datesByStudent, today, daySince = new Map()) {
  return students
    .map((s) => ({
      student_id: s.id,
      name: s.name,
      status: activityStatus(s, today),
      days_without_training: daysWithoutTraining(s, today),
      adherence_pct: adherence7d({
        assignedDays: routineDays.get(s.id) ?? [],
        finishedDates: datesByStudent.get(s.id) ?? [],
        today,
        since: s.created_at ? localDate(s.created_at) : null,
        daySince: daySince.get(s.id) ?? null,
      }).pct,
    }))
    .sort(byName);
}
