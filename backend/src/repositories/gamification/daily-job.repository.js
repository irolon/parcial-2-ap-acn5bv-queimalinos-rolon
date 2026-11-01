import { supabase } from '../../config/supabase.js';
import { unwrap, fetchAll } from '../../shared/utils/supabase-query.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';
import {
  STUDENT_CHALLENGES_TABLE,
  CHALLENGE_STATUS,
  CHALLENGE_GRACE_DAYS,
} from '../../models/gamification/gamification.model.js';
import { DAY_MS } from '../../shared/utils/dates/dates.js';

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

/**
 * Marca como `failed` las asignaciones activas cuyo `ends_at` pasó hace más de
 * CHALLENGE_GRACE_DAYS días. Hasta entonces siguen activas y el evaluador las
 * actualiza (una sesión offline sincronizada tarde todavía las puede completar).
 * Devuelve cuántas.
 */
export async function failExpiredAssignments(now) {
  const limit = new Date(now.getTime() - CHALLENGE_GRACE_DAYS * DAY_MS);
  const rows = unwrap(
    await supabase
      .from(STUDENT_CHALLENGES_TABLE)
      .update({ status: CHALLENGE_STATUS.FAILED })
      .eq('status', CHALLENGE_STATUS.ACTIVE)
      .lt('ends_at', limit.toISOString())
      .select('id')
  );
  return rows.length;
}
