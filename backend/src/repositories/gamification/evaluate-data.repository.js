import { supabase } from '../../config/supabase.js';
import { unwrap, fetchAll } from '../../shared/utils/supabase-query.js';
import { SESSIONS_TABLE, SESSION_SETS_TABLE } from '../../models/sessions/session.model.js';
import { ROUTINES_TABLE } from '../../models/routines/routine.model.js';
import { BODY_METRICS_TABLE } from '../../models/body-metrics/body-metric.model.js';
import {
  STUDENT_CHALLENGES_TABLE,
  STUDENT_CHALLENGE_COLUMNS,
  CHALLENGE_COLUMNS,
  CHALLENGE_STATUS,
} from '../../models/gamification/gamification.model.js';

/** Sesiones cerradas del alumno (id, started_at, finished_at), de la más vieja a la más nueva. */
export async function findClosedSessions(studentId) {
  return fetchAll(() =>
    supabase
      .from(SESSIONS_TABLE)
      .select('id, started_at, finished_at')
      .eq('student_id', studentId)
      .not('finished_at', 'is', null)
      .order('started_at')
      .order('id')
  );
}

/** Unión de los `days` de las rutinas activas del alumno ([] si no hay). */
export async function findAssignedDays(studentId) {
  const rows = unwrap(
    await supabase.from(ROUTINES_TABLE).select('days').eq('student_id', studentId).eq('active', true)
  );
  return [...new Set(rows.flatMap((row) => row.days ?? []))];
}

/** Asignaciones activas del alumno con el desafío embebido. */
export async function findActiveAssignments(studentId) {
  return unwrap(
    await supabase
      .from(STUDENT_CHALLENGES_TABLE)
      .select(`${STUDENT_CHALLENGE_COLUMNS}, challenge:challenges ( ${CHALLENGE_COLUMNS} )`)
      .eq('student_id', studentId)
      .eq('status', CHALLENGE_STATUS.ACTIVE)
  );
}

/** Series completadas de un lote de sesiones (session_id, actual_reps, actual_kg). */
export async function findCompletedSets(sessionIds) {
  const out = [];
  const CHUNK = 100;
  for (let i = 0; i < sessionIds.length; i += CHUNK) {
    const ids = sessionIds.slice(i, i + CHUNK);
    out.push(
      ...(await fetchAll(() =>
        supabase
          .from(SESSION_SETS_TABLE)
          .select('id, session_id, actual_reps, actual_kg')
          .in('session_id', ids)
          .eq('completed', true)
          .order('id')
      ))
    );
  }
  return out;
}

/** Pesos del alumno (weight_kg, recorded_at), del más viejo al más nuevo. */
export async function findWeights(studentId) {
  return unwrap(
    await supabase
      .from(BODY_METRICS_TABLE)
      .select('weight_kg, recorded_at')
      .eq('student_id', studentId)
      .not('weight_kg', 'is', null)
      .order('recorded_at')
      .order('id')
  );
}

/** Actualiza una asignación (progreso / estado). */
export async function updateAssignment(id, fields) {
  unwrap(await supabase.from(STUDENT_CHALLENGES_TABLE).update(fields).eq('id', id).select('id'));
}
