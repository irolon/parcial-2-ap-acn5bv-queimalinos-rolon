import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import {
  ROUTINE_EXERCISES_TABLE,
  ROUTINE_EXERCISE_COLUMNS,
} from '../../models/routines/routine.model.js';

/** Busca un ejercicio de una rutina; filtra por los dos ids (null si no es de esa rutina). */
export async function findRoutineExercise(routineId, routineExerciseId) {
  const { data, error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .select(ROUTINE_EXERCISE_COLUMNS)
    .eq('routine_id', routineId)
    .eq('id', routineExerciseId)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Cantidad de ejercicios de una rutina. */
export async function countRoutineExercises(routineId) {
  const { count, error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('routine_id', routineId);
  if (error) throw Errors.internal(error.message);
  return count ?? 0;
}

/** Mayor order_index de los ejercicios de una rutina; -1 si no tiene ninguno. */
export async function findMaxOrderIndex(routineId) {
  const { data, error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .select('order_index')
    .eq('routine_id', routineId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data ? data.order_index : -1;
}

/**
 * Actualiza campos de un ejercicio de rutina (sets, reps, descanso, kg, tempo, notas).
 * Filtra también por rutina; devuelve null si ya no existe.
 */
export async function updateRoutineExercise(routineId, routineExerciseId, fields) {
  const { data, error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .update(fields)
    .eq('routine_id', routineId)
    .eq('id', routineExerciseId)
    .select(ROUTINE_EXERCISE_COLUMNS)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Borra un ejercicio de una rutina. */
export async function deleteRoutineExercise(routineExerciseId) {
  const { error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .delete()
    .eq('id', routineExerciseId);
  if (error) throw Errors.internal(error.message);
}
