import * as inactivityRepo from '../../repositories/notifications/inactivity.repository.js';
import { findAssignedDays } from '../../repositories/gamification/evaluate-data.repository.js';
import { notify } from './notify.service.js';
import { texts } from '../../models/notifications/texts.js';
import { shouldPush } from '../../models/notifications/push-policy.js';
import {
  INACTIVITY_MISSED_DAYS,
  INACTIVITY_COOLDOWN_DAYS,
} from '../../models/notifications/notification.model.js';
import { missedAssignedDays, addDays } from '../../models/gamification/streak.js';
import { localDate, DAY_MS } from '../../shared/utils/dates/dates.js';

const toUtc = (str) => new Date(`${str}T00:00:00Z`).getTime();

/**
 * Cooldown por fecha argentina: el aviso previo bloquea solo si ocurrió después de `hoy - COOLDOWN`;
 * a los 7 días exactos se permite de nuevo aunque se haya creado unos segundos pasadas las 03:00 UTC.
 */
const isInCooldown = (createdAt, today) =>
  Boolean(createdAt) && localDate(createdAt) > addDays(today, -INACTIVITY_COOLDOWN_DAYS);

/** Evalúa a un alumno; devuelve true si avisó al entrenador, false si lo salteó. */
async function checkStudent(student, { lastStarts, notified, today }) {
  if (!student.trainer_id) return false;
  const lastDate = localDate(lastStarts.get(student.id) ?? student.created_at);
  const assignedDays = await findAssignedDays(student.id);
  // Sin rutina activa no hay días que saltearse: no se avisa.
  if (assignedDays.length === 0) return false;
  const missed = missedAssignedDays({ lastDate, assignedDays, today });
  if (missed < INACTIVITY_MISSED_DAYS || isInCooldown(notified.get(student.id), today)) return false;

  const daysSince = Math.round((toUtc(today) - toUtc(lastDate)) / DAY_MS);
  await notify({
    userId: student.trainer_id,
    userRole: 'trainer',
    type: 'inactivity',
    ...texts.inactivity({ studentName: student.name, daysSince, missed }),
    data: { student_id: student.id, missed_days: missed, days_since: daysSince },
    push: shouldPush('inactivity', 'trainer'),
  });
  return true;
}

/**
 * Job nocturno: avisa al entrenador de los alumnos activos que se saltearon
 * INACTIVITY_MISSED_DAYS o más días asignados, una vez cada INACTIVITY_COOLDOWN_DAYS días.
 * Un alumno que falla se loguea y no corta al resto.
 */
export async function runInactivityAlerts({ now = new Date() } = {}) {
  const [students, lastStarts, notified] = await Promise.all([
    inactivityRepo.findActiveStudents(),
    inactivityRepo.findLastClosedSessionStarts(),
    // Un día de margen: el filtro fino se hace por fecha argentina (isInCooldown).
    inactivityRepo.findLastInactivityNotifications(
      new Date(now.getTime() - (INACTIVITY_COOLDOWN_DAYS + 1) * DAY_MS).toISOString()
    ),
  ]);
  const ctx = { lastStarts, notified, today: localDate(now) };
  const result = { checked: 0, notified: 0, skipped: 0, errors: 0 };
  for (const student of students) {
    result.checked += 1;
    try {
      if (await checkStudent(student, ctx)) result.notified += 1;
      else result.skipped += 1;
    } catch (err) {
      result.errors += 1;
      console.error('[notifications] inactividad', student.id, err.message);
    }
  }
  return result;
}
