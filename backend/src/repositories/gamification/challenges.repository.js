import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import {
  ACHIEVEMENTS_TABLE,
  CHALLENGES_TABLE,
  CHALLENGE_COLUMNS,
  STUDENT_CHALLENGES_TABLE,
  CHALLENGE_STATUS,
} from '../../models/gamification/gamification.model.js';

/** Desafíos globales (trainer_id null) más los del entrenador; globales primero, luego por nombre. */
export async function findVisible(trainerId, goalType) {
  let query = supabase
    .from(CHALLENGES_TABLE)
    .select(CHALLENGE_COLUMNS)
    .or(`trainer_id.is.null,trainer_id.eq.${trainerId}`);
  if (goalType) query = query.eq('goal_type', goalType);
  const rows = unwrap(await query.order('name'));
  return [...rows.filter((r) => r.trainer_id === null), ...rows.filter((r) => r.trainer_id !== null)];
}

export async function findById(id) {
  return unwrap(
    await supabase.from(CHALLENGES_TABLE).select(CHALLENGE_COLUMNS).eq('id', id).maybeSingle()
  );
}

export async function insert(fields) {
  return unwrap(await supabase.from(CHALLENGES_TABLE).insert(fields).select(CHALLENGE_COLUMNS).single());
}

export async function update(id, fields) {
  return unwrap(
    await supabase.from(CHALLENGES_TABLE).update(fields).eq('id', id).select(CHALLENGE_COLUMNS).single()
  );
}

/** Borra el desafío (el service lo impide si tiene asignaciones: el cascade borraría el historial). */
export async function remove(id) {
  unwrap(await supabase.from(CHALLENGES_TABLE).delete().eq('id', id));
}

async function countAssignments(id, status) {
  let query = supabase
    .from(STUDENT_CHALLENGES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', id);
  if (status) query = query.eq('status', status);
  const { count, error } = await query;
  if (error) throw Errors.internal(error.message);
  return count > 0;
}

/** ¿Hay alguna asignación activa de este desafío? */
export const hasActiveAssignments = (id) => countAssignments(id, CHALLENGE_STATUS.ACTIVE);

/** ¿Hay alguna asignación, en cualquier estado (activa, completada, fallida o abandonada)? */
export const hasAssignments = (id) => countAssignments(id);

/** Asignaciones (challenge_id, status) de los alumnos de ese entrenador para esos desafíos; el service las agrupa. */
export async function countByChallenge(trainerId, challengeIds) {
  if (challengeIds.length === 0) return [];
  return unwrap(
    await supabase
      .from(STUDENT_CHALLENGES_TABLE)
      .select('challenge_id, status, students!inner(trainer_id)')
      .eq('students.trainer_id', trainerId)
      .in('challenge_id', challengeIds)
  );
}

/** Ids de los alumnos del entrenador que tienen el desafío activo. */
export async function findActiveStudentIds(challengeId, trainerId) {
  const rows = unwrap(
    await supabase
      .from(STUDENT_CHALLENGES_TABLE)
      .select('student_id, students!inner(trainer_id)')
      .eq('challenge_id', challengeId)
      .eq('status', CHALLENGE_STATUS.ACTIVE)
      .eq('students.trainer_id', trainerId)
  );
  return rows.map((r) => r.student_id);
}

/** ¿Existe el logro en el catálogo? */
export async function achievementExists(id) {
  const row = unwrap(await supabase.from(ACHIEVEMENTS_TABLE).select('id').eq('id', id).maybeSingle());
  return Boolean(row);
}
