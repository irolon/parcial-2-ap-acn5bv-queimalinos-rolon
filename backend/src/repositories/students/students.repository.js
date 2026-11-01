import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { fetchAll } from '../../shared/utils/supabase-query.js';
import { localDate } from '../../shared/utils/dates.js';
import { ROUTINES_TABLE } from '../../models/routines/routine.model.js';
import { SESSIONS_TABLE } from '../../models/sessions/session.model.js';
import {
  STUDENTS_TABLE,
  STUDENT_LIST_COLUMNS,
  STUDENT_DETAIL_COLUMNS,
  STUDENT_LAST_SESSION_VIEW,
} from '../../models/students/student.model.js';

/** Lista (paginada) los alumnos de un trainer, con filtros opcionales. */
export async function findStudentsByTrainer({ trainerId, active, search, page, limit }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase
    .from(STUDENTS_TABLE)
    .select(STUDENT_LIST_COLUMNS, { count: 'exact' })
    .eq('trainer_id', trainerId);
  if (active !== undefined) query = query.eq('active', active);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw Errors.internal(error.message);
  return { data, total: count ?? 0 };
}

/** Busca un alumno por email, incluyendo el password_hash (para login). */
export async function findStudentByEmailWithHash(email) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select(`${STUDENT_DETAIL_COLUMNS}, password_hash`)
    .eq('email', email)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca un alumno por id (ficha base, sin el hash). null si no existe. */
export async function findStudentById(id) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select(STUDENT_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Crea un alumno y devuelve sus campos públicos (sin el hash). */
export async function createStudent({
  trainerId,
  name,
  email,
  goal,
  gymEquipment = null,
  injuries = null,
  level = null,
  passwordHash,
}) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .insert({
      trainer_id: trainerId,
      name,
      email,
      goal,
      gym_equipment: gymEquipment,
      injuries,
      level,
      password_hash: passwordHash,
    })
    .select(STUDENT_DETAIL_COLUMNS)
    .single();
  // 23505 = unique_violation (email duplicado).
  if (error && error.code === '23505') throw Errors.studentEmailExists();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Última sesión de cada alumno pedido. Los que nunca entrenaron no vienen. */
export async function findLastSessionDates(studentIds) {
  const { data, error } = await supabase
    .from(STUDENT_LAST_SESSION_VIEW)
    .select('student_id, last_session_at')
    .in('student_id', studentIds);
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Actualiza campos del alumno y devuelve la ficha base. */
export async function updateStudent(id, fields) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .update(fields)
    .eq('id', id)
    .select(STUDENT_DETAIL_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Agrupa filas por student_id; cada alumno pedido arranca con []. */
const groupByStudent = (studentIds, rows, pick) => {
  const out = new Map(studentIds.map((id) => [id, []]));
  for (const row of rows) out.get(row.student_id)?.push(pick(row));
  return out;
};

/** Días de las rutinas activas de cada alumno (unión, sin repetidos). */
export async function findActiveRoutineDays(studentIds) {
  // PostgREST corta en 1000 filas: se pagina con orden estable.
  const rows = await fetchAll(() =>
    supabase
      .from(ROUTINES_TABLE)
      .select('id, student_id, days')
      .in('student_id', studentIds)
      .eq('active', true)
      .order('id')
  );
  const grouped = groupByStudent(studentIds, rows, (r) => r.days ?? []);
  return new Map([...grouped].map(([id, lists]) => [id, [...new Set(lists.flat())]]));
}

/** Fechas locales AR ('YYYY-MM-DD') de las sesiones terminadas desde `fromIso`, por alumno. */
export async function findFinishedSessionDates(studentIds, fromIso) {
  const rows = await fetchAll(() =>
    supabase
      .from(SESSIONS_TABLE)
      .select('id, student_id, started_at')
      .in('student_id', studentIds)
      .gte('started_at', fromIso)
      .not('finished_at', 'is', null)
      .order('id')
  );
  return groupByStudent(studentIds, rows, (r) => localDate(r.started_at));
}
