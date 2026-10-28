import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import {
  SESSIONS_TABLE,
  SESSION_SETS_TABLE,
} from '../../models/sessions/session.model.js';
import { ROUTINE_EXERCISES_TABLE } from '../../models/routines/routine.model.js';

/** Series ya guardadas con esos ids: [{ id, session_id }] (de cualquier sesión). */
export async function findSetsByIds(ids) {
  const { data, error } = await supabase
    .from(SESSION_SETS_TABLE)
    .select('id, session_id')
    .in('id', ids);
  if (error) throw Errors.internal(error.message);
  return data;
}

/** De esos ids, los que son ejercicios de la rutina dada. */
export async function findRoutineExerciseIds(routineId, ids) {
  const { data, error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .select('id')
    .eq('routine_id', routineId)
    .in('id', ids);
  if (error) throw Errors.internal(error.message);
  return data.map((row) => row.id);
}

/** Inserta o actualiza las series por id en una sola sentencia (atómica). */
export async function upsertSets(rows) {
  const { data, error } = await supabase
    .from(SESSION_SETS_TABLE)
    .upsert(rows, { onConflict: 'id' })
    .select('id');
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Marca la sesión con sustituciones; nunca vuelve a false. */
export async function markSessionModified(sessionId) {
  const { error } = await supabase
    .from(SESSIONS_TABLE)
    .update({ has_modifications: true })
    .eq('id', sessionId);
  if (error) throw Errors.internal(error.message);
}
