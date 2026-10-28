import { Errors } from '../../shared/utils/errors.js';
import * as sessionsRepo from '../../repositories/sessions/sessions.repository.js';

const RETRY_UPDATABLE = ['finished_at', 'rpe', 'notes'];

/**
 * Sesión del alumno por id. Ajena e inexistente se responden igual (404) para
 * no filtrar ids ajenos. La usan también las series (ADR 0001).
 */
export async function getOwnedSession(studentId, sessionId) {
  const session = await sessionsRepo.findSessionById(sessionId);
  if (!session || session.student_id !== studentId) throw Errors.sessionNotFound();
  return session;
}

/**
 * POST /sessions — idempotente por id. Si ya existe y es del alumno, solo
 * completa finished_at / rpe / notes que vengan; started_at y routine_id
 * quedan como estaban. Si es de otro alumno, 409.
 */
export async function create(studentId, body) {
  if (body.routine_id && !(await sessionsRepo.isRoutineOfStudent(body.routine_id, studentId))) {
    throw Errors.validation('Error de validación', [
      { field: 'routine_id', message: 'routine_id no es una rutina del alumno' },
    ]);
  }

  const inserted = await sessionsRepo.insertSession({ ...body, student_id: studentId });
  if (inserted) return { session: inserted, created: true };

  const existing = await sessionsRepo.findSessionById(body.id);
  if (!existing || existing.student_id !== studentId) throw Errors.sessionIdConflict();

  const changes = {};
  for (const field of RETRY_UPDATABLE) {
    if (body[field] !== null && body[field] !== undefined) changes[field] = body[field];
  }
  if (Object.keys(changes).length === 0) return { session: existing, created: false };
  return { session: await sessionsRepo.updateSession(body.id, changes), created: false };
}

/** PATCH /sessions/:id — cierra la sesión o corrige RPE / notas. */
export async function update(studentId, sessionId, body) {
  const session = await getOwnedSession(studentId, sessionId);
  if (body.finished_at && Date.parse(body.finished_at) < Date.parse(session.started_at)) {
    throw Errors.validation('Error de validación', [
      { field: 'finished_at', message: 'finished_at no puede ser anterior a started_at' },
    ]);
  }
  return sessionsRepo.updateSession(sessionId, body);
}
