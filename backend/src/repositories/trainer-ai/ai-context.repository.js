import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';
import { ROUTINE_TEMPLATES_TABLE } from '../../models/routine-templates/routine-template.model.js';
import { ROUTINES_TABLE } from '../../models/routines/routine.model.js';
import { LIBRARY_LIMIT, PREVIOUS_TEMPLATES, PREVIOUS_ROUTINES } from '../../models/trainer-ai/ai-generation.model.js';

/**
 * Biblioteca que viaja a n8n: ejercicios globales y propios del trainer cuyo
 * equipamiento está en `equipment`, solo las columnas que necesita la IA.
 */
export async function findLibraryForEquipment(trainerId, equipment) {
  return unwrap(
    await supabase
      .from(EXERCISES_TABLE)
      .select('id, name, muscle_group, equipment')
      .or(`is_global.eq.true,trainer_id.eq.${trainerId}`)
      .in('equipment', equipment)
      .order('name')
      .limit(LIBRARY_LIMIT)
  );
}

/** Los ejercicios de `ids` que siguen accesibles para el trainer (globales o propios). */
export async function findLibraryByIds(trainerId, ids) {
  if (ids.length === 0) return [];
  return unwrap(
    await supabase
      .from(EXERCISES_TABLE)
      .select('id, name, muscle_group, equipment')
      .or(`is_global.eq.true,trainer_id.eq.${trainerId}`)
      .in('id', ids)
  );
}

/** Las plantillas más recientes del trainer (contexto de estilo para la IA), sin el nombre. */
export async function findRecentTemplates(trainerId) {
  return unwrap(
    await supabase
      .from(ROUTINE_TEMPLATES_TABLE)
      .select('goal, level, structure')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(PREVIOUS_TEMPLATES)
  );
}

/**
 * Las rutinas más recientes del trainer con ese objetivo (activas o no), sin el nombre ni el alumno:
 * solo goal, días y nombres de ejercicio. `excludeStudentId` deja afuera las del alumno en curso.
 */
export async function findRecentRoutines(trainerId, { goal, excludeStudentId = null }) {
  let query = supabase
    .from(ROUTINES_TABLE)
    .select('goal, days, routine_exercises ( order_index, exercise:exercise_id ( name ) )')
    .eq('trainer_id', trainerId)
    .eq('goal', goal);
  if (excludeStudentId) query = query.neq('student_id', excludeStudentId);
  return unwrap(await query.order('created_at', { ascending: false }).limit(PREVIOUS_ROUTINES));
}
