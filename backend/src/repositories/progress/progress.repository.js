import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';

/**
 * Un punto por día con series que cuentan (función SQL exercise_progress).
 * Los números pueden llegar como string: el modelo los redondea.
 */
export async function fetchExerciseProgress({ studentId, exerciseId, from, to }) {
  const { data, error } = await supabase.rpc('exercise_progress', {
    p_student_id: studentId,
    p_exercise_id: exerciseId,
    p_from: from,
    p_to: to,
  });
  if (error) throw Errors.internal(error.message);
  return data ?? [];
}

/**
 * Último peso por ejercicio (función SQL last_session_kg), en una sola llamada.
 * Devuelve { [exercise_id]: kg }; los ejercicios nunca hechos no aparecen.
 */
export async function fetchLastSessionKg(studentId, exerciseIds) {
  const { data, error } = await supabase.rpc('last_session_kg', {
    p_student_id: studentId,
    p_exercise_ids: exerciseIds,
  });
  if (error) throw Errors.internal(error.message);
  return Object.fromEntries((data ?? []).map((r) => [r.exercise_id, r.last_session_kg]));
}
