import { getOwnedSession } from './sessions.service.js';
import * as setsRepo from '../../repositories/sessions/session-sets.repository.js';
import { findAccessibleExerciseIds } from '../../repositories/routines/routines.repository.js';
import { findStudentById } from '../../repositories/students/students.repository.js';
import { validateSetsEnvelope } from '../../validations/sessions/sessions.validation.js';
import { isSubstitution } from '../../models/sessions/session.model.js';
import { parseBatch, failure } from './classifySets.js';

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
 * POST /sessions/:id/sets — lote idempotente (upsert por id). Las series
 * válidas se guardan aunque otras fallen; se aceptan en sesiones cerradas.
 */
export async function addSets(studentId, sessionId, body) {
  const session = await getOwnedSession(studentId, sessionId);
  const { sets } = validateSetsEnvelope(body);

  const { valid, failed } = parseBatch(sets);
  let candidates = valid;
  const created = new Map();

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
      created.set(value.id, owner === undefined);
      return true;
    });
  }
  if (candidates.length > 0) candidates = await checkExercises(studentId, candidates, failed);
  if (candidates.length === 0) return { saved: [], failed: sortByIndex(failed) };

  await resolveRoutineLinks(session, candidates);
  const rows = candidates.map(({ value }) => ({ ...value, session_id: session.id }));
  await setsRepo.upsertSets(rows);
  if (rows.some(isSubstitution)) await setsRepo.markSessionModified(session.id);

  return {
    saved: rows.map(({ id }) => ({ id, created: created.get(id) })),
    failed: sortByIndex(failed),
  };
}

const sortByIndex = (failed) => failed.sort((a, b) => a.index - b.index);
