import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { PREFERENCES_TABLE, PREFERENCE_COLUMNS } from '../../models/notifications/preferences.js';

/** Preferencias guardadas del alumno, o null si nunca guardó (todo prendido). */
export async function findByStudent(studentId) {
  return unwrap(
    await supabase.from(PREFERENCES_TABLE).select(PREFERENCE_COLUMNS).eq('student_id', studentId).maybeSingle()
  );
}

/** Reemplaza las cinco preferencias del alumno (crea la fila si no existía). */
export async function upsert(studentId, prefs, now) {
  return unwrap(
    await supabase
      .from(PREFERENCES_TABLE)
      .upsert({ student_id: studentId, ...prefs, updated_at: now }, { onConflict: 'student_id' })
      .select(PREFERENCE_COLUMNS)
      .single()
  );
}
