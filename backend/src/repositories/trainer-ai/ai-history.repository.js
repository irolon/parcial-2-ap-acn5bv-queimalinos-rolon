import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';

/** Sesiones del alumno terminadas desde `sinceIso` (inclusive), de la más nueva a la más vieja. */
export async function findFinishedSessionsSince(studentId, sinceIso) {
  return unwrap(
    await supabase
      .from(SESSIONS_TABLE)
      .select('id, finished_at, rpe')
      .eq('student_id', studentId)
      .gte('finished_at', sinceIso)
      .order('finished_at', { ascending: false })
  );
}
