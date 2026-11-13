import { supabase } from '../../config/supabase.js';
import { fetchAll } from '../../shared/utils/supabase-query.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';

/*
 * Lecturas de la exportación CSV (GX1). session_sets tiene DOS FK a exercises
 * (exercise_id y original_exercise_id): el embed necesita el nombre de la FK
 * para saber cuál seguir. Son los nombres que Postgres pone por defecto a las
 * FK de 04-progress.sql.
 */
const EXPORT_COLUMNS =
  'id, student_id, started_at, finished_at, rpe, notes, trainer_comment, ' +
  'routine:routines(name), ' +
  'session_sets(set_number, actual_reps, actual_kg, completed, rest_seconds, executed_at, ' +
  'exercise:exercises!session_sets_exercise_id_fkey(name), ' +
  'original:exercises!session_sets_original_exercise_id_fkey(name))';

// Cada sesión trae todas sus series: páginas más chicas que el tope de PostgREST.
const PAGE = 500;

/** Sesiones (con rutina y series) de los alumnos dados, por fecha de inicio. */
export async function findSessionsForStudents(studentIds) {
  if (studentIds.length === 0) return [];
  return fetchAll(
    () =>
      supabase
        .from(SESSIONS_TABLE)
        .select(EXPORT_COLUMNS)
        .in('student_id', studentIds)
        .order('started_at')
        // Desempate estable: sin él, la paginación puede repetir o saltear filas.
        .order('id'),
    PAGE
  );
}

/** Alumnos del trainer, activos y dados de baja (el CSV del PT incluye a todos), paginando. */
export async function findTrainerStudents(trainerId) {
  return fetchAll(() =>
    supabase
      .from(STUDENTS_TABLE)
      .select('id, name, email, active')
      .eq('trainer_id', trainerId)
      .order('name')
      // Desempate estable para la paginación, como el resto del repo de alumnos.
      .order('id')
  );
}
