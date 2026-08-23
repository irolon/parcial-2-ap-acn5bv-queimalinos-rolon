import { hashPassword } from '../../shared/utils/password.js';
import { Errors } from '../../shared/utils/errors.js';
import { issueTokens } from '../auth/auth.service.js';
import * as invitationsRepo from '../../repositories/invitations/invitations.repository.js';
import * as studentsRepo from '../../repositories/students/students.repository.js';
import { isUsed, isExpired } from '../../models/invitations/invitation.model.js';

/** Lista los alumnos del trainer con paginación y filtros (GET /students). */
export async function list(trainerId, { active, search, page = 1, limit = 20 } = {}) {
  const { data, total } = await studentsRepo.findStudentsByTrainer({
    trainerId,
    active,
    search,
    page,
    limit,
  });
  return {
    data,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
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
