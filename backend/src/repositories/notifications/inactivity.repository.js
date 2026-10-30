import { supabase } from '../../config/supabase.js';
import { fetchAll } from '../../shared/utils/supabase-query.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';
import { NOTIFICATIONS_TABLE } from '../../models/notifications/notification.model.js';

/** Alumnos activos (id, trainer_id, name, created_at). */
export async function findActiveStudents() {
  return fetchAll(() =>
    supabase.from(STUDENTS_TABLE).select('id, trainer_id, name, created_at').eq('active', true).order('id')
  );
}

/** Mapa student_id → started_at de su última sesión cerrada (una sola consulta). */
export async function findLastClosedSessionStarts() {
  const rows = await fetchAll(() =>
    supabase
      .from(SESSIONS_TABLE)
      .select('student_id, started_at')
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .order('id')
  );
  const last = new Map();
  for (const row of rows) if (!last.has(row.student_id)) last.set(row.student_id, row.started_at);
  return last;
}

/** Set de student_id con un aviso de inactividad creado desde `sinceIso` (una sola consulta). */
export async function findStudentsNotifiedSince(sinceIso) {
  const rows = await fetchAll(() =>
    supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id, data')
      .eq('type', 'inactivity')
      .gte('created_at', sinceIso)
      .order('id')
  );
  return new Set(rows.map((row) => row.data?.student_id).filter(Boolean));
}
