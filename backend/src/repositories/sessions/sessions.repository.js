import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { SESSIONS_TABLE, SESSION_COLUMNS } from '../../models/sessions/session.model.js';
import { ROUTINES_TABLE } from '../../models/routines/routine.model.js';

/**
 * Inserta una sesión. Devuelve null si el id (generado en el cliente) ya
 * existe (23505): es un reintento y el service resuelve qué responder.
 */
export async function insertSession(fields) {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .insert(fields)
    .select(SESSION_COLUMNS)
    .single();
  if (error && error.code === '23505') return null;
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca una sesión por id, o null. */
export async function findSessionById(id) {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select(SESSION_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Actualiza campos de una sesión y devuelve la fila. */
export async function updateSession(id, fields) {
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .update(fields)
    .eq('id', id)
    .select(SESSION_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** ¿La rutina existe y es del alumno (activa o no)? */
export async function isRoutineOfStudent(routineId, studentId) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select('id')
    .eq('id', routineId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data !== null;
}
