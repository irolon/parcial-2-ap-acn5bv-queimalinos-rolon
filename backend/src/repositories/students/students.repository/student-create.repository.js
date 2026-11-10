import { supabase } from '../../../config/supabase.js';
import { Errors } from '../../../shared/utils/errors.js';
import { STUDENTS_TABLE, STUDENT_DETAIL_COLUMNS } from '../../../models/students/student.model.js';

/** Crea un alumno y devuelve sus campos públicos (sin el hash). */
export async function createStudent({
  trainerId,
  name,
  email,
  goal,
  gymEquipment = null,
  injuries = null,
  level = null,
  phone = null,
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
      phone,
      password_hash: passwordHash,
    })
    .select(STUDENT_DETAIL_COLUMNS)
    .single();
  // 23505 = unique_violation (email duplicado).
  if (error && error.code === '23505') throw Errors.studentEmailExists();
  if (error) throw Errors.internal(error.message);
  return data;
}
