/**
 * Resumen del Inicio del entrenador (GET /students/overview). Funciones puras: reciben los alumnos
 * activos, sus días asignados, sus sesiones terminadas de los últimos 15 días y las últimas 10, y
 * arman KPIs, "requieren atención", actividad reciente y las listas de los filtros de la app. Fechas en hora argentina.
 */
import { addDays, weekdayOf } from '../gamification/streak.js';
import { localDate } from '../../shared/utils/dates.js';
import { adherence7d } from './adherence.js';
import { activityStatus } from './activity.js';
import { feedbackList, riskList, studentsList, todayList } from './overview-lists.js';

export const ATTENTION_LIMIT = 10;

/** Promedio redondeado de los pct no nulos, o null si no hay ninguno. */
function averagePct(results) {
  const pcts = results.map((r) => r.pct).filter((p) => p !== null);
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
}

/**
 * Promedio de la adherencia de 7 días y su variación contra la semana anterior. Con los mismos pisos que
 * GET /students (alta del alumno y fecha de la rutina): un alumno que todavía no existía o no tenía la rutina
 * no cuenta como 0 % en esa semana, queda null y afuera del promedio.
 */
function adherenceKpi(students, routineDays, daySince, datesByStudent, today) {
  const at = (day) => students.map((s) => adherence7d({
    assignedDays: routineDays.get(s.id) ?? [],
    finishedDates: datesByStudent.get(s.id) ?? [],
    today: day,
    since: s.created_at ? localDate(s.created_at) : null,
    daySince: daySince.get(s.id) ?? null,
  }));
  const pct = averagePct(at(today));
  const previous = averagePct(at(addDays(today, -7)));
  return { pct, delta: pct !== null && previous !== null ? pct - previous : null };
}

/** "Requieren atención" (la usa la web): en riesgo y después feedback pendiente, con tope. */
function attention(risk, feedback) {
  return [
    ...risk.map((r) => ({ kind: 'inactive', ...r })),
    ...feedback.map(({ rpe: _rpe, ...f }) => ({ kind: 'feedback_pending', ...f })),
  ].slice(0, ATTENTION_LIMIT);
}

/**
 * students: activos con { id, name, created_at, last_session_at }. routineDays: Map id → días.
 * daySince (opcional): Map id → (Map día de la semana → desde qué fecha vale), de scheduleOf.
 * sessions: terminadas desde hoy-14, con { id, student_id, started_at, finished_at, rpe, trainer_comment, routine_name }.
 * recent: las últimas terminadas (ya ordenadas y con tope), con la misma forma.
 */
export function buildOverview({ students, routineDays, daySince = new Map(), sessions, recent, today }) {
  const nameById = new Map(students.map((s) => [s.id, s.name]));
  const datesByStudent = new Map();
  for (const s of sessions) {
    const list = datesByStudent.get(s.student_id) ?? [];
    list.push(localDate(s.started_at));
    datesByStudent.set(s.student_id, list);
  }
  const todayWeekday = weekdayOf(today);
  const plannedToday = new Set(students.filter((s) => (routineDays.get(s.id) ?? []).includes(todayWeekday)).map((s) => s.id));
  const newSince = addDays(today, -6);
  const risk = riskList(students, today);
  const feedback = feedbackList(sessions, nameById, today);
  return {
    active_students: {
      count: students.length,
      new_7d: students.filter((s) => localDate(s.created_at) >= newSince).length,
    },
    sessions_today: {
      // De los que tienen hoy asignado (expected), cuántos TERMINARON una sesión hoy: una que empezó ayer
      // a las 23:30 y terminó hoy cuenta hoy. Así nunca da "9 de 8" (revisión de la #58).
      done: new Set(
        sessions.filter((s) => localDate(s.finished_at) === today && plannedToday.has(s.student_id)).map((s) => s.student_id)
      ).size,
      expected: plannedToday.size,
    },
    adherence_7d: adherenceKpi(students, routineDays, daySince, datesByStudent, today),
    at_risk: students.filter((s) => activityStatus(s, today) === 'inactive').length,
    attention: attention(risk, feedback),
    recent: recent.map((s) => ({
      student_id: s.student_id, name: nameById.get(s.student_id) ?? null, session_id: s.id,
      routine_name: s.routine_name ?? null, rpe: s.rpe ?? null, finished_at: s.finished_at,
    })),
    lists: {
      today: todayList(students, routineDays, sessions, today),
      at_risk: risk,
      feedback_pending: feedback,
      students: studentsList(students, routineDays, datesByStudent, today, daySince),
    },
  };
}
