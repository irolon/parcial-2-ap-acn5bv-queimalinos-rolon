import { hashPassword } from '../../shared/utils/password.js';
import { Errors } from '../../shared/utils/errors.js';
import { issueTokens } from '../auth/auth.service.js';
import * as invitationsRepo from '../../repositories/invitations/invitations.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository/students.repository.js';
import * as studentCreateRepo from '../../repositories/students/students.repository/student-create.repository.js';
import { isUsed, isExpired } from '../../models/invitations/invitation.model.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import * as routinesRepo from '../../repositories/routines/routines.repository.js';
import { latestForStudent } from '../body-metrics/body-metrics.service.js';
import { assertCanAccessStudent } from './student-access.service.js';
import { signAvatars } from './avatar-urls.service.js';
import { assignInitialRoutine } from './initial-routine.service.js';
import * as appointments from '../agenda/appointments.service.js';
import { localDate } from '../../shared/utils/dates/dates.js';
import { adherence7d, adherenceWindowStart, daysPerWeek } from '../../models/students/adherence.js';
import { STUDENT_SELF_EDITABLE, STUDENT_SELF_EDIT_FORBIDDEN } from '../../models/students/student.model.js';

/**
 * Lista los alumnos del trainer (GET /students) con la fecha de su última
 * sesión, su racha, los días por semana de su rutina activa y la adherencia de los
 * últimos 7 días (models/students/adherence.js). Por defecto solo activos.
 * Cada dato extra sale de UNA consulta por lote para toda la página; la racha sale de
 * student_streaks (null si todavía no se calculó).
 */
export async function list(trainerId, { active = true, search, page = 1, limit = 20 } = {}) {
  const { data: rows, total } = await studentsRepo.findStudentsByTrainer({
    trainerId,
    active,
    search,
    page,
    limit,
  });
  const meta = { total, page, limit, total_pages: Math.ceil(total / limit) };

  // .in('student_id', []) es inválido en PostgREST: con la página vacía no se consulta.
  if (!rows.length) return { data: [], meta };

  const ids = rows.map((s) => s.id);
  const today = localDate();
  const [lastSessions, streaks, schedules, finishedDates] = await Promise.all([
    studentsRepo.findLastSessionDates(ids),
    studentsRepo.findStreaks(ids),
    studentsRepo.findActiveRoutineSchedules(ids),
    // AR = UTC-3 fijo (sin horario de verano), la misma zona que TIMEZONE de shared/utils/dates/dates.js.
    studentsRepo.findFinishedSessionDates(ids, `${adherenceWindowStart(today)}T00:00:00-03:00`),
  ]);
  const lastByStudent = new Map(lastSessions.map((r) => [r.student_id, r.last_session_at]));
  const streakByStudent = new Map(
    streaks.map(({ student_id, ...streak }) => [student_id, streak])
  );

  const data = rows.map((s) => {
    const { days: assignedDays, daySince } = schedules.get(s.id) ?? { days: [], daySince: new Map() };
    // Los días anteriores al alta o a la rutina no cuentan como faltados.
    const since = s.created_at ? localDate(s.created_at) : null;
    return {
      ...s,
      last_session_at: lastByStudent.get(s.id) ?? null,
      streak: streakByStudent.get(s.id) ?? null,
      days_per_week: daysPerWeek(assignedDays),
      adherence_7d: adherence7d({ assignedDays, finishedDates: finishedDates.get(s.id), today, since, daySince }),
    };
  });
  // GX2: avatar_url guarda la ruta; se firma toda la página en una llamada.
  return { data: await signAvatars(data), meta };
}

/** Arma la ficha: fila del alumno + última medida (con IMC) + rutina activa + última sesión. */
async function buildDetail(row) {
  const [[student], latestMetrics, activeRoutine, lastSessions] = await Promise.all([
    signAvatars([row]),
    latestForStudent(row.id),
    routinesRepo.findActiveRoutineSummary(row.id),
    studentsRepo.findLastSessionDates([row.id]),
  ]);
  return {
    ...student,
    latest_metrics: latestMetrics,
    active_routine: activeRoutine,
    last_session_at: lastSessions[0]?.last_session_at ?? null,
  };
}

/** GET /students/:id — ficha completa. Trainer dueño o el propio alumno. */
export async function getById(user, studentId) {
  const student = await assertCanAccessStudent(user, studentId);
  return buildDetail(student);
}

/**
 * PATCH /students/:id — el trainer dueño (todo) o el propio alumno (GX2: solo
 * STUDENT_SELF_EDITABLE; cualquier otro campo → 403 antes de tocar nada). Con active = false se revocan
 * sus refresh tokens: no puede renovar la sesión. El access token que tenga en
 * la mano vive hasta JWT_EXPIRES_IN (1 h).
 *
 * Sin transacción entre tablas, se revoca ANTES de guardar la baja y en cada
 * baja (aunque ya estuviera inactivo; revocar es idempotente). Si la revocación
 * falla, la baja no se guarda y el reintento la completa; al revés, un alumno
 * quedaría inactivo con tokens vivos que volverían a andar al reactivarlo.
 * Los turnos futuros (pending o confirmed) se cancelan DESPUÉS de guardar la
 * baja: cancelar no tiene vuelta atrás, y si la baja fallara el alumno quedaría
 * activo sin sus turnos. Si cancelar falla, el reintento (active:false de nuevo)
 * los vuelve a cancelar. Un alta de turno en vuelo no se cuela: la base rechaza
 * el insert de un alumno inactivo (trigger appointments_student_active, que
 * además bloquea la fila del alumno hasta que el alta termine).
 */
export async function update(user, studentId, fields) {
  await assertCanAccessStudent(user, studentId);
  if (user.role === 'student' && Object.keys(fields).some((f) => !STUDENT_SELF_EDITABLE.includes(f))) {
    throw Errors.forbidden(STUDENT_SELF_EDIT_FORBIDDEN);
  }

  if (fields.active === false) await authRepo.revokeAllForUser(studentId, 'student');
  const updated = await studentsRepo.updateStudent(studentId, fields);
  if (fields.active === false) await appointments.cancelFutureForStudent(studentId);
  return buildDetail(updated);
}

/** GX2: la invitación guarda solo dígitos; se copia si entra en students.phone (6 a 30). */
const phoneFromInvitation = (phone) => (phone && phone.length >= 6 && phone.length <= 30 ? phone : null);

/**
 * CU-02 — Crea la cuenta del alumno a partir del token de invitación, marca la
 * invitación como usada y devuelve al alumno autenticado (con tokens de sesión).
 */
export async function registerFromInvitation({ token, password }) {
  const invitation = await invitationsRepo.findInvitationByToken(token);
  if (!invitation) throw Errors.invitationNotFound();
  if (isUsed(invitation)) throw Errors.invitationUsed();
  if (isExpired(invitation)) throw Errors.invitationExpired();

  const passwordHash = await hashPassword(password);

  // Reclamar ANTES de crear el alumno. El chequeo de isUsed() de arriba es solo
  // un atajo para dar un error lindo: el punto de sincronización real es este
  // UPDATE condicionado. Si acá se crea primero el alumno y se marca después,
  // dos requests simultáneas pasan las dos y queda un alumno duplicado.
  const reclamada = await invitationsRepo.claimInvitation(invitation.id);
  if (!reclamada) throw Errors.invitationUsed();

  let student;
  try {
    student = await studentCreateRepo.createStudent({
      trainerId: invitation.trainer.id,
      name: invitation.student_name,
      email: invitation.student_email,
      goal: invitation.student_goal,
      gymEquipment: invitation.student_gym_equipment ?? null,
      injuries: invitation.student_injuries ?? null,
      level: invitation.student_level ?? null,
      phone: phoneFromInvitation(invitation.student_phone),
      passwordHash,
    });
  } catch (err) {
    // Sin transacción entre tablas: si la creación falla, liberamos la
    // invitación para que el alumno pueda reintentar en vez de quedar afuera.
    await invitationsRepo.releaseInvitation(invitation.id);
    throw err;
  }

  // Plantilla inicial de la invitación (GX8): nunca hace fallar el alta.
  await assignInitialRoutine(invitation, student);
  const tokens = await issueTokens(student, 'student');
  return { student, ...tokens };
}
