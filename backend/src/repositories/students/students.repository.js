import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
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

/** Todos los alumnos activos del trainer, por nombre (mensajería: id, name, avatar_url). */
export async function findActiveStudentsByTrainer(trainerId) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select('id, name, avatar_url')
    .eq('trainer_id', trainerId)
    .eq('active', true)
    .order('name');
  if (error) throw Errors.internal(error.message);
  return data;
}

/** De los `ids` pedidos, los que son alumnos activos del trainer (para validar un envío masivo). */
export async function findActiveStudentsByIds(trainerId, ids) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('active', true)
    .in('id', ids);
  if (error) throw Errors.internal(error.message);
  return data;
}
