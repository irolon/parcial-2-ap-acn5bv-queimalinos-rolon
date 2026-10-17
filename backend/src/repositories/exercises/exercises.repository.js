import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { EXERCISES_TABLE, EXERCISE_COLUMNS } from '../../models/exercises/exercise.model.js';

/**
 * Lista ejercicios visibles para un trainer: los globales + los propios
 * (o solo los propios si includeGlobal = false), con filtros opcionales.
 */
export async function findExercises({ trainerId, muscleGroup, equipment, search, includeGlobal }) {
  let query = supabase.from(EXERCISES_TABLE).select(EXERCISE_COLUMNS);

  if (includeGlobal) {
    query = query.or(`is_global.eq.true,trainer_id.eq.${trainerId}`);
  } else {
    query = query.eq('trainer_id', trainerId);
  }
  if (muscleGroup) query = query.eq('muscle_group', muscleGroup);
  if (equipment) query = query.eq('equipment', equipment);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query.order('name');
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca un ejercicio por id (para validar ownership). */
export async function findExerciseById(id) {
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .select(EXERCISE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Crea un ejercicio personalizado del trainer. */
export async function createExercise(fields) {
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .insert(fields)
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Actualiza un ejercicio existente. */
export async function updateExercise(id, fields) {
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .update(fields)
    .eq('id', id)
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Elimina un ejercicio. */
export async function deleteExercise(id) {
  const { error } = await supabase.from(EXERCISES_TABLE).delete().eq('id', id);
  if (error) throw Errors.internal(error.message);
}
