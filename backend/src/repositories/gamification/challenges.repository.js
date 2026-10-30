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

/** Borra el desafío; las asignaciones terminadas caen por cascade. */
export async function remove(id) {
  unwrap(await supabase.from(CHALLENGES_TABLE).delete().eq('id', id));
}

/** ¿Hay alguna asignación activa de este desafío? */
export async function hasActiveAssignments(id) {
  const { count, error } = await supabase
    .from(STUDENT_CHALLENGES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', id)
    .eq('status', CHALLENGE_STATUS.ACTIVE);
  if (error) throw Errors.internal(error.message);
  return count > 0;
}

/** ¿Existe el logro en el catálogo? */
export async function achievementExists(id) {
  const row = unwrap(await supabase.from(ACHIEVEMENTS_TABLE).select('id').eq('id', id).maybeSingle());
  return Boolean(row);
}
