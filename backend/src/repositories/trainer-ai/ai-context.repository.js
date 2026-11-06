import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';
import { ROUTINE_TEMPLATES_TABLE } from '../../models/routine-templates/routine-template.model.js';
import { LIBRARY_LIMIT, PREVIOUS_TEMPLATES } from '../../models/trainer-ai/ai-generation.model.js';

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

/** Las plantillas más recientes del trainer (contexto de estilo para la IA). */
export async function findRecentTemplates(trainerId) {
  return unwrap(
    await supabase
      .from(ROUTINE_TEMPLATES_TABLE)
      .select('name, goal, level, structure')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })
      .limit(PREVIOUS_TEMPLATES)
  );
}
