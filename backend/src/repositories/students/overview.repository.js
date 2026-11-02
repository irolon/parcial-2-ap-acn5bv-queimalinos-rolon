import { supabase } from '../../config/supabase.js';
import { fetchAll, unwrap } from '../../shared/utils/supabase-query.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';

const SESSION_COLUMNS = 'id, student_id, started_at, finished_at, rpe, trainer_comment, routine:routines ( name )';

/** La rutina embebida → routine_name, como la usa models/students/overview.js. */
const flatten = ({ routine, ...s }) => ({ ...s, routine_name: routine?.name ?? null });

/** Alumnos activos del trainer (id, name, created_at). */
export async function findActiveStudents(trainerId) {
  return fetchAll(() =>
    supabase.from(STUDENTS_TABLE).select('id, name, created_at').eq('trainer_id', trainerId).eq('active', true).order('id')
  );
}

/** Sesiones terminadas de esos alumnos que empezaron desde `fromIso`. */
export async function findFinishedSessionsSince(studentIds, fromIso) {
  const rows = await fetchAll(() =>
    supabase
      .from(SESSIONS_TABLE)
      .select(SESSION_COLUMNS)
      .in('student_id', studentIds)
      .gte('started_at', fromIso)
      .not('finished_at', 'is', null)
      .order('id')
  );
  return rows.map(flatten);
}

/** Las últimas `limit` sesiones terminadas de esos alumnos, de la más nueva a la más vieja. */
export async function findRecentFinished(studentIds, limit) {
  const rows = unwrap(
    await supabase
      .from(SESSIONS_TABLE)
      .select(SESSION_COLUMNS)
      .in('student_id', studentIds)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(limit)
  );
  return rows.map(flatten);
}
