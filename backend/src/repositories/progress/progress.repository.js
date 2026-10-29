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
