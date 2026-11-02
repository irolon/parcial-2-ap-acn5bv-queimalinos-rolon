import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import {
  ACHIEVEMENTS_TABLE,
  ACHIEVEMENT_COLUMNS,
  STUDENT_ACHIEVEMENTS_TABLE,
  STUDENT_ACHIEVEMENT_COLUMNS,
  STUDENT_STREAKS_TABLE,
  STUDENT_STREAK_COLUMNS,
} from '../../models/gamification/gamification.model.js';

/** Catálogo completo de logros, ordenado por categoría y código. */
export async function findCatalog() {
  return unwrap(
    await supabase
      .from(ACHIEVEMENTS_TABLE)
      .select(ACHIEVEMENT_COLUMNS)
      .order('category')
      .order('code')
  );
}

/** Ids de los logros ya desbloqueados por el alumno. */
export async function findUnlockedAchievementIds(studentId) {
  const rows = unwrap(
    await supabase.from(STUDENT_ACHIEVEMENTS_TABLE).select('achievement_id').eq('student_id', studentId)
  );
  return rows.map((row) => row.achievement_id);
}

/** Desbloqueos del alumno: solo `achievement_id` y `unlocked_at` (el progreso ya tiene el catálogo). */
export async function findUnlockedAt(studentId) {
  return unwrap(
    await supabase
      .from(STUDENT_ACHIEVEMENTS_TABLE)
      .select('achievement_id, unlocked_at')
      .eq('student_id', studentId)
  );
}

/** Desbloqueados del alumno con el logro embebido, el más reciente primero. */
export async function findStudentAchievements(studentId) {
  return unwrap(
    await supabase
      .from(STUDENT_ACHIEVEMENTS_TABLE)
      .select(
        `${STUDENT_ACHIEVEMENT_COLUMNS}, achievement:achievements ( code, name, description, icon_url, category )`
      )
      .eq('student_id', studentId)
      .order('unlocked_at', { ascending: false })
      .order('id', { ascending: false })
  );
}

/**
 * Inserta desbloqueos ({ student_id, achievement_id, context }). Si ya existían
 * se ignoran: devuelve solo las filas realmente insertadas.
 */
export async function insertUnlocked(rows) {
  if (rows.length === 0) return [];
  return unwrap(
    await supabase
      .from(STUDENT_ACHIEVEMENTS_TABLE)
      .upsert(rows, { onConflict: 'student_id,achievement_id', ignoreDuplicates: true })
      .select('achievement_id')
  );
}

/** Fila de student_streaks del alumno, o null. */
export async function findStreak(studentId) {
  return unwrap(
    await supabase
      .from(STUDENT_STREAKS_TABLE)
      .select(STUDENT_STREAK_COLUMNS)
      .eq('student_id', studentId)
      .maybeSingle()
  );
}

/** Guarda la racha ({ current_days, longest_days, last_trained_date }) por student_id. */
export async function upsertStreak(studentId, streak) {
  return unwrap(
    await supabase
      .from(STUDENT_STREAKS_TABLE)
      .upsert(
        { student_id: studentId, ...streak, updated_at: new Date().toISOString() },
        { onConflict: 'student_id' }
      )
      .select(STUDENT_STREAK_COLUMNS)
      .single()
  );
}
