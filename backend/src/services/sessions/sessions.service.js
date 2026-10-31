import { Errors } from '../../shared/utils/errors.js';
import { safeEvaluate } from '../gamification/safe-evaluate.js';
import { onSessionClosed } from '../notifications/triggers.service.js';
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
 * Reintento (el id ya existe): solo completa los finished_at / rpe / notes que
 * vengan Y que estén en null en la base; nunca pisa un valor guardado (las
 * correcciones van por PATCH). started_at y routine_id quedan como estaban, sin validarse. Un
 * finished_at anterior al started_at guardado se ignora (sin error), para no
 * perder el rpe y las notas del mismo request.
 */
async function applyRetry(studentId, body, existing) {
  if (!existing || existing.student_id !== studentId) throw Errors.sessionIdConflict();

  const changes = {};
  for (const field of RETRY_UPDATABLE) {
    const incoming = body[field];
    if (incoming !== null && incoming !== undefined && existing[field] === null) changes[field] = incoming;
  }
  if (changes.finished_at && Date.parse(changes.finished_at) < Date.parse(existing.started_at)) {
    delete changes.finished_at;
  }
  if (Object.keys(changes).length === 0) return { session: existing, created: false };
  return { session: await sessionsRepo.updateSession(body.id, changes), created: false };
}

/**
 * POST /sessions — idempotente por id. Un routine_id que no es del alumno
 * (ajeno o borrado) nunca rechaza el request: la sesión se crea sin rutina.
 * Si el id ya existe es un reintento (otro alumno: 409).
 * Devuelve además `unlocked_achievements`: los logros que desbloquea si la
 * sesión quedó cerrada; si no, [].
 */
export async function create(studentId, body) {
  const result = await createOrRetry(studentId, body);
  // Llegó cerrada (nueva o completada por el reintento): puede desbloquear logros.
  const unlocked_achievements = result.session.finished_at ? await safeEvaluate(studentId) : [];
  if (result.session.finished_at) {
    void onSessionClosed({ studentId, session: result.session, unlocked: unlocked_achievements });
  }
  return { ...result, unlocked_achievements };
}

async function createOrRetry(studentId, body) {
  const existing = await sessionsRepo.findSessionById(body.id);
  if (existing) return applyRetry(studentId, body, existing);

  const owned = body.routine_id && (await sessionsRepo.isRoutineOfStudent(body.routine_id, studentId));
  const inserted = await sessionsRepo.insertSession({
    ...body,
    routine_id: owned ? body.routine_id : null,
    student_id: studentId,
  });
  if (inserted) return { session: inserted, created: true };

  // Carrera: otro request creó el mismo id entre la lectura y el insert (23505).
  return applyRetry(studentId, body, await sessionsRepo.findSessionById(body.id));
}

/**
 * PATCH /sessions/:id — cierra la sesión o corrige RPE / notas. Devuelve la
 * sesión + unlocked_achievements (los logros recién desbloqueados al cerrar).
 */
export async function update(studentId, sessionId, body) {
  const session = await getOwnedSession(studentId, sessionId);
  if (body.finished_at && Date.parse(body.finished_at) < Date.parse(session.started_at)) {
    throw Errors.validation('Error de validación', [
      { field: 'finished_at', message: 'finished_at no puede ser anterior a started_at' },
    ]);
  }
  const updated = await sessionsRepo.updateSession(sessionId, body);
  const unlocked_achievements = body.finished_at ? await safeEvaluate(studentId) : [];
  if (body.finished_at) void onSessionClosed({ studentId, session: updated, unlocked: unlocked_achievements });
  return { ...updated, unlocked_achievements };
}
