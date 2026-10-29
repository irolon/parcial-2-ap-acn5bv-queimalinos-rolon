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

// PostgREST corta en 1000 filas por respuesta: se pagina hasta una página corta.
const PAGE = 1000;
async function fetchAll(buildQuery) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = unwrap(await buildQuery().range(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** Sesiones del alumno, más recientes primero. Devuelve { data, total }. */
export async function findSessionsPage(studentId, { page, limit }) {
  const from = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from(SESSIONS_TABLE)
    .select(HISTORY_COLUMNS, { count: 'exact' })
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .order('id', { ascending: false })
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

/** Una sesión por id (con trainer_comment), o null. */
export async function findSessionById(sessionId) {
  return unwrap(
    await supabase.from(SESSIONS_TABLE).select(HISTORY_COLUMNS).eq('id', sessionId).maybeSingle()
  );
}

/** Guarda (o borra con null) el comentario del entrenador y devuelve la fila. */
export async function updateTrainerComment(sessionId, comment) {
  return unwrap(
    await supabase
      .from(SESSIONS_TABLE)
      .update({ trainer_comment: comment })
      .eq('id', sessionId)
      .select(HISTORY_COLUMNS)
      .single()
  );
}

/** Series de varias sesiones en una sola consulta. */
export async function findSetsForSessions(sessionIds) {
  return fetchAll(() =>
    supabase.from(SESSION_SETS_TABLE).select(SET_COLUMNS).in('session_id', sessionIds).order('id')
  );
}

/** Pares (session_id, exercise_id) con récord, vía la función SQL session_records. */
export async function fetchSessionRecords(studentId, sessionIds) {
  return fetchAll(() =>
    supabase
      .rpc('session_records', { p_student_id: studentId, p_session_ids: sessionIds })
      .order('session_id')
      .order('exercise_id')
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
