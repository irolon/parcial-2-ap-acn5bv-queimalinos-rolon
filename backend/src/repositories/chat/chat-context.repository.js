import { supabase } from '../../config/supabase.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';
import { ALTERNATIVES_LIMIT } from '../../models/chat/chat-message.model.js';

/**
 * Alternativas que viajan a n8n: ejercicios accesibles para el alumno (globales y los de su
 * PT; solo globales si no tiene) con equipamiento en `equipment`, del grupo `muscleGroup`
 * (todos si es null) y sin `excludeId` (el ejercicio actual). Solo columnas de contexto.
 */
export async function findAlternatives(trainerId, { equipment, muscleGroup = null, excludeId = null }) {
  let query = supabase.from(EXERCISES_TABLE).select('id, name, muscle_group, equipment');
  query = trainerId ? query.or(`is_global.eq.true,trainer_id.eq.${trainerId}`) : query.eq('is_global', true);
  query = query.in('equipment', equipment);
  if (muscleGroup) query = query.eq('muscle_group', muscleGroup);
  if (excludeId) query = query.neq('id', excludeId);
  return unwrap(await query.order('name').limit(ALTERNATIVES_LIMIT));
}
