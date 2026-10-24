import { hashPassword } from '../../shared/utils/password.js';
import { Errors } from '../../shared/utils/errors.js';
import { issueTokens } from '../auth/auth.service.js';
import * as invitationsRepo from '../../repositories/invitations/invitations.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { isUsed, isExpired } from '../../models/invitations/invitation.model.js';
import * as authRepo from '../../repositories/auth/auth.repository.js';
import * as routinesRepo from '../../repositories/routines/routines.repository.js';
import { latestForStudent } from '../body-metrics/body-metrics.service.js';
import { assertCanAccessStudent } from './student-access.service.js';

/**
 * Lista los alumnos del trainer (GET /students) con la fecha de su última
 * sesión. Por defecto solo activos. La última sesión sale de una segunda
 * consulta a la vista student_last_session (ver student.model.js).
 */
export async function list(trainerId, { active = true, search, page = 1, limit = 20 } = {}) {
  const { data: rows, total } = await studentsRepo.findStudentsByTrainer({
    trainerId,
    active,
    search,
    page,
    limit,
  });

  // .in('student_id', []) es inválido en PostgREST: con la página vacía no se consulta.
  const lastSessions = rows.length
    ? await studentsRepo.findLastSessionDates(rows.map((s) => s.id))
    : [];
  const lastByStudent = new Map(lastSessions.map((r) => [r.student_id, r.last_session_at]));

  return {
    data: rows.map((s) => ({ ...s, last_session_at: lastByStudent.get(s.id) ?? null })),
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
}

/** Arma la ficha: fila del alumno + última medida (con IMC) + rutina activa + última sesión. */
async function buildDetail(student) {
  const [latestMetrics, activeRoutine, lastSessions] = await Promise.all([
    latestForStudent(student.id),
    routinesRepo.findActiveRoutineSummary(student.id),
    studentsRepo.findLastSessionDates([student.id]),
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
 * PATCH /students/:id — solo el trainer dueño. Con active = false se revocan
 * sus refresh tokens: no puede renovar la sesión. El access token que tenga en
 * la mano vive hasta JWT_EXPIRES_IN (1 h).
 *
 * Sin transacción entre tablas, se revoca ANTES de guardar la baja y en cada
 * baja (aunque ya estuviera inactivo; revocar es idempotente). Si la revocación
 * falla, la baja no se guarda y el reintento la completa; al revés, un alumno
 * quedaría inactivo con tokens vivos que volverían a andar al reactivarlo.
 */
export async function update(user, studentId, fields) {
  if (user.role !== 'trainer') throw Errors.forbidden();
  await assertCanAccessStudent(user, studentId);

  if (fields.active === false) await authRepo.revokeAllForUser(studentId, 'student');
  const updated = await studentsRepo.updateStudent(studentId, fields);
  return buildDetail(updated);
}

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
    student = await studentsRepo.createStudent({
      trainerId: invitation.trainer.id,
      name: invitation.student_name,
      email: invitation.student_email,
      goal: invitation.student_goal,
      gymEquipment: invitation.student_gym_equipment ?? null,
      injuries: invitation.student_injuries ?? null,
      level: invitation.student_level ?? null,
      passwordHash,
    });
  } catch (err) {
    // Sin transacción entre tablas: si la creación falla, liberamos la
    // invitación para que el alumno pueda reintentar en vez de quedar afuera.
    await invitationsRepo.releaseInvitation(invitation.id);
    throw err;
  }

  const tokens = await issueTokens(student, 'student');
  return { student, ...tokens };
}
