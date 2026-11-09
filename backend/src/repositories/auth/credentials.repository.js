import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { TRAINERS_TABLE } from '../../models/auth/trainer.model.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';

/*
 * Credenciales de trainers y students (GX1: cambio y blanqueo de la clave).
 * Vive aparte de auth.repository porque lee y escribe password_hash de las
 * dos tablas según el rol del token, nunca por email como el login.
 */
const tableFor = (role) => (role === 'trainer' ? TRAINERS_TABLE : STUDENTS_TABLE);

/** Hash de la clave del usuario. null si no existe o no tiene clave. */
export async function findPasswordHash(id, role) {
  const { data, error } = await supabase
    .from(tableFor(role))
    .select('password_hash')
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data?.password_hash ?? null;
}

/**
 * Guarda el hash nuevo y la fecha del cambio. must_change_password solo
 * existe en students: el blanqueo lo prende y el cambio lo apaga.
 */
export async function setPassword(id, role, { hash, mustChange }) {
  const patch = { password_hash: hash, password_changed_at: new Date().toISOString() };
  if (role === 'student') patch.must_change_password = mustChange;
  const { data, error } = await supabase
    .from(tableFor(role))
    .update(patch)
    .eq('id', id)
    .select('password_changed_at')
    .single();
  if (error) throw Errors.internal(error.message);
  return { password_changed_at: data.password_changed_at };
}
