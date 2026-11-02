import * as studentsRepo from '../../repositories/students/students.repository.js';
import { fetchSessionRecords } from '../../repositories/sessions/session-history.repository.js';
import { buildAttendance, monthRange } from '../../models/students/attendance.js';
import { localDate } from '../../shared/utils/dates.js';
import { assertCanAccessStudent } from './student-access.service.js';

/** Argentina no tiene horario de verano: el día local empieza a las 00:00 -03:00. */
const startOfLocalDay = (date) => `${date}T00:00:00-03:00`;

/**
 * GET /students/:id/attendance — resumen y asistencia de un mes. Trainer dueño o el propio alumno
 * (mismo ownership que la ficha: ajeno o inexistente → 403). Los días asignados son los de las
 * rutinas activas actuales, como la racha (ADR 0005), sin contar los anteriores al alta del alumno
 * ni a la rutina que los asigna (el mismo piso que la adherencia de GET /students).
 */
export async function attendance(user, studentId, month) {
  const student = await assertCanAccessStudent(user, studentId);
  const { first, next } = monthRange(month);
  const [schedules, rows] = await Promise.all([
    studentsRepo.findActiveRoutineSchedules([studentId]),
    studentsRepo.findFinishedSessionsBetween(studentId, startOfLocalDay(first), startOfLocalDay(next)),
  ]);
  const sessions = rows.map((r) => ({ id: r.id, date: localDate(r.started_at) }));
  const records = sessions.length ? await fetchSessionRecords(studentId, sessions.map((s) => s.id)) : [];
  const { days: assignedDays, daySince } = schedules.get(studentId) ?? { days: [], daySince: new Map() };
  return buildAttendance({
    month,
    today: localDate(),
    assignedDays,
    since: student.created_at ? localDate(student.created_at) : null,
    daySince,
    sessions,
    recordSessionIds: records.map((r) => r.session_id),
  });
}
