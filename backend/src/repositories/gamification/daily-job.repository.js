import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';
import { STUDENT_CHALLENGES_TABLE, CHALLENGE_STATUS } from '../../models/gamification/gamification.model.js';

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

/**
 * Ids de los alumnos activos con al menos una sesión cerrada o una asignación
 * de desafío activa (los únicos que el job diario tiene que recalcular).
 */
export async function findStudentIdsToEvaluate() {
  const [students, sessions, assignments] = await Promise.all([
    fetchAll(() => supabase.from(STUDENTS_TABLE).select('id').eq('active', true).order('id')),
    fetchAll(() =>
      supabase.from(SESSIONS_TABLE).select('student_id').not('finished_at', 'is', null).order('id')
    ),
    fetchAll(() =>
      supabase
        .from(STUDENT_CHALLENGES_TABLE)
        .select('student_id')
        .eq('status', CHALLENGE_STATUS.ACTIVE)
        .order('id')
    ),
  ]);
  const withActivity = new Set([...sessions, ...assignments].map((row) => row.student_id));
  return students.map((s) => s.id).filter((id) => withActivity.has(id));
}

/** Marca como `failed` las asignaciones activas vencidas antes de `now`. Devuelve cuántas. */
export async function failExpiredAssignments(now) {
  const rows = unwrap(
    await supabase
      .from(STUDENT_CHALLENGES_TABLE)
      .update({ status: CHALLENGE_STATUS.FAILED })
      .eq('status', CHALLENGE_STATUS.ACTIVE)
      .lt('ends_at', now.toISOString())
      .select('id')
  );
  return rows.length;
}
