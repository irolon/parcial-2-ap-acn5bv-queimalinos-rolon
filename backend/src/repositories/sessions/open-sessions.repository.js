import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';

/**
 * Sesiones abiertas (sin finished_at) de esos alumnos que empezaron desde `sinceIso` (ver openSince), de la
 * más nueva a la más vieja, con { id, student_id, started_at, routine_name }. Las usan GET /students
 * (open_session) y GET /students/overview (in_session). Con la lista vacía no consulta.
 */
export async function findOpenSessions(studentIds, sinceIso) {
  if (!studentIds.length) return [];
  const rows = unwrap(
    await supabase
      .from(SESSIONS_TABLE)
      .select('id, student_id, started_at, routine:routines ( name )')
      .in('student_id', studentIds)
      .is('finished_at', null)
      .gte('started_at', sinceIso)
      .order('started_at', { ascending: false })
  );
  return rows.map(({ routine, ...s }) => ({ ...s, routine_name: routine?.name ?? null }));
}
