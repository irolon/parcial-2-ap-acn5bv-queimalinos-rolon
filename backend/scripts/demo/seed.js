import bcrypt from 'bcryptjs';
import { evaluateStudent } from '../../src/services/gamification/evaluate.service.js';
import { onSessionClosed } from '../../src/services/notifications/triggers.service.js';
import { notify } from '../../src/services/notifications/notify.service.js';
import { texts } from '../../src/models/notifications/texts.js';
import { missedAssignedDays } from '../../src/models/gamification/streak.js';
import { addDays, atLocal, daysBetween, localDateOf } from './dates.js';
import { STUDENTS } from './people.js';
import { writeInvitation, writeStudent, writeTemplates, writeTrainer } from './write-people.js';
import {
  writeAiChats, writeAppointments, writeChallenge, writeHistory, writeMessages,
} from './write-activity.js';

// Carga completa de la demo. Lo que la app calcula a partir del historial (rachas, logros, desafíos,
// récords y avisos) lo hacen sus propios servicios después de insertar, no el script.

/** Aviso de inactividad al PT por un alumno que dejó de venir (mismo texto que el job nocturno). */
async function notifyInactivity({ trainerId, student, lastSession, days, today }) {
  const lastDate = localDateOf(new Date(lastSession.started_at));
  const missed = missedAssignedDays({ lastDate, assignedDays: days, today });
  const daysSince = daysBetween(lastDate, today);
  await notify({
    userId: trainerId, userRole: 'trainer', type: 'inactivity', push: false,
    ...texts.inactivity({ studentName: student.name, daysSince, missed }),
    data: { student_id: student.id, missed_days: missed, days_since: daysSince },
  });
}

/** Carga la demo en `db` (cliente con service role). Devuelve un resumen para la consola. */
export async function seedDemo(db, { password, now = new Date(), log = console.log }) {
  const today = localDateOf(now);
  const passwordHash = await bcrypt.hash(password, 10);
  const weeks = Math.max(...STUDENTS.map((s) => s.weeks));
  const { trainer, exerciseIds } = await writeTrainer(db, {
    passwordHash, createdAt: atLocal(addDays(today, -7 * weeks - 7), 10),
  });
  const templates = await writeTemplates(db, trainer.id, exerciseIds);
  log(`Entrenadora y ${templates.length} plantillas cargadas`);

  const studentIds = new Map();
  const lastSessions = new Map();
  const loaded = [];
  for (const s of STUDENTS) {
    const written = await writeStudent(db, s, { trainerId: trainer.id, passwordHash, exerciseIds, today });
    const sessions = await writeHistory(db, s, { ...written, today, exerciseIds });
    studentIds.set(s.key, written.student.id);
    if (sessions[0]) lastSessions.set(s.key, sessions[0]);
    loaded.push({ s, student: written.student, routines: written.routines, sessions });
    log(`  ${s.name}: ${sessions.length} sesiones`);
  }

  await writeInvitation(db, trainer.id, now);
  await writeMessages(db, studentIds, today);
  await writeAiChats(db, { studentIds, lastSessions, exerciseIds });
  await writeAppointments(db, { trainerId: trainer.id, studentIds, today });
  await writeChallenge(db, { trainerId: trainer.id, studentIds, now });

  for (const { s, student, routines, sessions } of loaded) {
    if (sessions.length === 0) continue;
    const { unlocked, streak } = await evaluateStudent(student.id, { now });
    await onSessionClosed({ studentId: student.id, session: sessions[0], unlocked });
    if (s.stoppedDaysAgo) {
      const days = [...new Set(routines.flatMap((r) => r.days))];
      await notifyInactivity({ trainerId: trainer.id, student, lastSession: sessions[0], days, today });
    }
    log(`  ${s.name}: racha ${streak.current_days ?? streak.current ?? 0}, ${unlocked.length} logros`);
  }
  return { trainerId: trainer.id, students: loaded.length, sessions: loaded.reduce((n, l) => n + l.sessions.length, 0) };
}
