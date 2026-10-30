import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { NOTIFICATIONS_TABLE } from '../../models/notifications/notification.model.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';
import { ACHIEVEMENTS_TABLE } from '../../models/gamification/gamification.model.js';

/** Nombre y entrenador del alumno (o null si no existe). */
export async function findStudentInfo(studentId) {
  return unwrap(
    await supabase.from(STUDENTS_TABLE).select('id, name, trainer_id').eq('id', studentId).maybeSingle()
  );
}

/** Mapa id → nombre de los ejercicios pedidos. */
export async function findExerciseNames(ids) {
  if (ids.length === 0) return new Map();
  const rows = unwrap(await supabase.from(EXERCISES_TABLE).select('id, name').in('id', ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Mapa code → descripción de los logros pedidos. */
export async function findAchievementDescriptions(codes) {
  if (codes.length === 0) return new Map();
  const rows = unwrap(await supabase.from(ACHIEVEMENTS_TABLE).select('code, description').in('code', codes));
  return new Map(rows.map((r) => [r.code, r.description]));
}

/** ¿Ya hay una notificación de ese tipo para el usuario con ese session_id en data? */
export async function existsForSession(type, userId, sessionId) {
  const rows = unwrap(
    await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id')
      .eq('type', type)
      .eq('user_id', userId)
      .eq('data->>session_id', sessionId)
      .limit(1)
  );
  return rows.length > 0;
}
