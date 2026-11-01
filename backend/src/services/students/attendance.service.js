import * as studentsRepo from '../../repositories/students/students.repository.js';
import { findAssignedDays } from '../../repositories/gamification/evaluate-data.repository.js';
import { fetchSessionRecords } from '../../repositories/sessions/session-history.repository.js';
import { buildAttendance, monthRange } from '../../models/students/attendance.js';
import { localDate } from '../../shared/utils/dates.js';
import { assertCanAccessStudent } from './student-access.service.js';

/** Argentina no tiene horario de verano: el día local empieza a las 00:00 -03:00. */
const startOfLocalDay = (date) => `${date}T00:00:00-03:00`;

/**
 * GET /students/:id/attendance — resumen y asistencia de un mes. Trainer dueño o el propio alumno
 * (mismo ownership que la ficha: ajeno o inexistente → 403). Los días asignados son los de las
 * rutinas activas actuales, como la racha (ADR 0005).
 */
export async function attendance(user, studentId, month) {
  await assertCanAccessStudent(user, studentId);
  const { first, next } = monthRange(month);
  const [assignedDays, rows] = await Promise.all([
    findAssignedDays(studentId),
    studentsRepo.findFinishedSessionsBetween(studentId, startOfLocalDay(first), startOfLocalDay(next)),
  ]);
  const sessions = rows.map((r) => ({ id: r.id, date: localDate(r.started_at) }));
  const records = sessions.length ? await fetchSessionRecords(studentId, sessions.map((s) => s.id)) : [];
  return buildAttendance({
    month,
    today: localDate(),
    assignedDays,
    sessions,
    recordSessionIds: records.map((r) => r.session_id),
  });
}
