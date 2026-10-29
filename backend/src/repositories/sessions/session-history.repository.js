import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { SESSIONS_TABLE, SESSION_SETS_TABLE } from '../../models/sessions/session.model.js';
import { ROUTINES_TABLE, ROUTINE_EXERCISES_TABLE } from '../../models/routines/routine.model.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';

// Columnas propias del historial: incluyen trainer_comment (SESSION_COLUMNS no,
// porque alimenta el camino de escritura del alumno).
const HISTORY_COLUMNS =
  'id, student_id, routine_id, started_at, finished_at, rpe, notes, trainer_comment, has_modifications';
const SET_COLUMNS =
  'id, session_id, exercise_id, original_exercise_id, routine_exercise_id, set_number, actual_reps, actual_kg, completed, executed_at';

const unwrap = ({ data, error }) => {
  if (error) throw Errors.internal(error.message);
  return data;
};

/** Sesiones del alumno, más recientes primero. Devuelve { data, total }. */
export async function findSessionsPage(studentId, { page, limit }) {
  const from = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from(SESSIONS_TABLE)
    .select(HISTORY_COLUMNS, { count: 'exact' })
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw Errors.internal(error.message);
  return { data, total: count ?? 0 };
}

/** Una sesión de ESE alumno, o null (ajena e inexistente son indistinguibles). */
export async function findStudentSession(studentId, sessionId) {
  return unwrap(
    await supabase
      .from(SESSIONS_TABLE)
      .select(HISTORY_COLUMNS)
      .eq('id', sessionId)
      .eq('student_id', studentId)
      .maybeSingle()
  );
}

/** Series de varias sesiones en una sola consulta. */
export async function findSetsForSessions(sessionIds) {
  return unwrap(
    await supabase.from(SESSION_SETS_TABLE).select(SET_COLUMNS).in('session_id', sessionIds)
  );
}

/** Pares (session_id, exercise_id) con récord, vía la función SQL session_records. */
export async function fetchSessionRecords(studentId, sessionIds) {
  return unwrap(
    await supabase.rpc('session_records', { p_student_id: studentId, p_session_ids: sessionIds })
  );
}

/** Nombres de rutinas por lote. */
export async function findRoutinesByIds(ids) {
  return unwrap(await supabase.from(ROUTINES_TABLE).select('id, name').in('id', ids));
}

/** Plan actual (sets, reps, suggested_kg) por lote de routine_exercises. */
export async function findRoutineExercisesByIds(ids) {
  return unwrap(
    await supabase.from(ROUTINE_EXERCISES_TABLE).select('id, sets, reps, suggested_kg').in('id', ids)
  );
}

/** Nombres de ejercicios por lote. */
export async function findExercisesByIds(ids) {
  return unwrap(await supabase.from(EXERCISES_TABLE).select('id, name').in('id', ids));
}
