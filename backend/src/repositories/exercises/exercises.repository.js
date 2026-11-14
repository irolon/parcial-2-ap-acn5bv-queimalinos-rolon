import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import {
  EXERCISES_TABLE,
  EXERCISE_COLUMNS,
  EXERCISE_DETAIL_COLUMNS,
  LIBRARY_COLUMNS,
} from '../../models/exercises/exercise.model.js';

/**
 * Lista ejercicios visibles para un trainer: los globales + los propios
 * (o solo los propios si includeGlobal = false), con filtros opcionales. Sin los archivados.
 */
export async function findExercises({ trainerId, muscleGroup, equipment, search, includeGlobal }) {
  let query = supabase.from(EXERCISES_TABLE).select(EXERCISE_COLUMNS).is('archived_at', null);

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

/**
 * Biblioteca de un alumno: los globales + los del entrenador (solo los globales si
 * trainerId es null). Solo columnas públicas, sin archivados, ordenada por nombre.
 */
export async function findLibrary(trainerId) {
  let query = supabase.from(EXERCISES_TABLE).select(LIBRARY_COLUMNS).is('archived_at', null);
  query = trainerId
    ? query.or(`is_global.eq.true,trainer_id.eq.${trainerId}`)
    : query.eq('is_global', true);

  const { data, error } = await query.order('name');
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca un ejercicio por id (para validar ownership), archivado o no: trae `archived_at`. */
export async function findExerciseById(id) {
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .select(EXERCISE_DETAIL_COLUMNS)
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

/** Borra un ejercicio. `false` si no se puede porque está en uso (23503: lo usa una rutina o una sesión). */
export async function deleteExercise(id) {
  const { error } = await supabase.from(EXERCISES_TABLE).delete().eq('id', id);
  if (error?.code === '23503') return false;
  if (error) throw Errors.internal(error.message);
  return true;
}

/** Archiva un ejercicio (sale de la biblioteca; rutinas e historial lo siguen resolviendo por id). */
export async function archiveExercise(id) {
  const { error } = await supabase
    .from(EXERCISES_TABLE)
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .is('archived_at', null);
  if (error) throw Errors.internal(error.message);
}
