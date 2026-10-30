import { getOwnedSession } from './sessions.service.js';
import * as setsRepo from '../../repositories/sessions/session-sets.repository.js';
import { findAccessibleExerciseIds } from '../../repositories/routines/routines.repository.js';
import { findStudentById } from '../../repositories/students/students.repository.js';
import { isSubstitution } from '../../models/sessions/session.model.js';
import { safeEvaluate } from '../gamification/safe-evaluate.js';
import { onSessionClosed, onSessionModified } from '../notifications/triggers.service.js';
import { parseBatch, failure } from './classify-sets.js';
import { persistSets } from './persist-sets.js';

/** Ejercicios que el alumno puede ver: un fallo por serie con alguno inaccesible. */
async function checkExercises(studentId, candidates, failed) {
  const ids = new Set();
  for (const { value } of candidates) {
    ids.add(value.exercise_id);
    if (value.original_exercise_id) ids.add(value.original_exercise_id);
  }
  const student = await findStudentById(studentId);
  const accessible = new Set(await findAccessibleExerciseIds([...ids], student.trainer_id));
  return candidates.filter(({ value, index }) => {
    const ok = accessible.has(value.exercise_id)
      && (!value.original_exercise_id || accessible.has(value.original_exercise_id));
    if (!ok) failed.push(failure(value.id, index, 'EXERCISE_NOT_FOUND', 'El ejercicio no existe'));
    return ok;
  });
}

/**
 * routine_exercise_id es solo un enlace al plan: si no es de la rutina de la
 * sesión (o la sesión no tiene rutina) la serie se guarda con null.
 */
async function resolveRoutineLinks(session, candidates) {
  const wanted = [...new Set(candidates.map((c) => c.value.routine_exercise_id).filter(Boolean))];
  let valid = new Set();
  if (session.routine_id && wanted.length > 0) {
    valid = new Set(await setsRepo.findRoutineExerciseIds(session.routine_id, wanted));
  }
  for (const { value } of candidates) {
    if (value.routine_exercise_id && !valid.has(value.routine_exercise_id)) {
      value.routine_exercise_id = null;
    }
  }
}

/**
 * POST /sessions/:id/sets — lote idempotente por id. Las series
 * válidas se guardan aunque otras fallen; se aceptan en sesiones cerradas.
 */
export async function addSets(studentId, sessionId, { sets }) {
  const session = await getOwnedSession(studentId, sessionId);

  const { valid, failed } = parseBatch(sets);
  let candidates = valid;
  const existingIds = new Set();

  if (candidates.length > 0) {
    const existing = new Map(
      (await setsRepo.findSetsByIds(candidates.map((c) => c.value.id))).map((s) => [s.id, s.session_id])
    );
    candidates = candidates.filter(({ value, index }) => {
      const owner = existing.get(value.id);
      if (owner !== undefined && owner !== session.id) {
        failed.push(failure(value.id, index, 'SET_ID_CONFLICT', 'Ya existe una serie con ese id'));
        return false;
      }
      if (owner !== undefined) existingIds.add(value.id);
      return true;
    });
  }
  if (candidates.length > 0) candidates = await checkExercises(studentId, candidates, failed);
  if (candidates.length === 0) return { saved: [], failed: sortByIndex(failed), unlocked_achievements: [] };

  await resolveRoutineLinks(session, candidates);
  const saved = await persistSets(session.id, candidates, existingIds, failed);
  const substitutions = saved
    .filter(({ value }) => isSubstitution(value))
    .map(({ value }) => ({ from: value.original_exercise_id, to: value.exercise_id }));
  if (substitutions.length > 0) {
    await setsRepo.markSessionModified(session.id);
    await onSessionModified({ studentId, session, substitutions });
  }

  // Series sobre una sesión ya cerrada pueden cambiar récords y logros.
  const unlocked_achievements =
    session.finished_at && saved.length > 0 ? await safeEvaluate(studentId) : [];
  if (session.finished_at && saved.length > 0) {
    await onSessionClosed({ studentId, session, unlocked: unlocked_achievements });
  }

  return {
    saved: saved.map(({ value, created }) => ({ id: value.id, created })),
    failed: sortByIndex(failed),
    unlocked_achievements,
  };
}

const sortByIndex = (failed) => failed.sort((a, b) => a.index - b.index);
