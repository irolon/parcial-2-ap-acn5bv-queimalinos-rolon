import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { unwrap } from '../../shared/utils/supabase-query.js';
import { AI_GENERATIONS_TABLE, GENERATION_COLUMNS } from '../../models/trainer-ai/ai-generation.model.js';

// Errores propios de save_ai_generation_templates (database/schema/06-ai-and-agenda/01-ai.sql).
const ALREADY_SAVED = 'FT002';
const NOT_FOUND = 'FT003';

/** created_at de las generaciones del trainer desde `sinceIso` (más viejas primero), hasta `limit`. */
export async function findGenerationTimesSince(trainerId, sinceIso, limit) {
  return unwrap(
    await supabase
      .from(AI_GENERATIONS_TABLE)
      .select('created_at')
      .eq('trainer_id', trainerId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .limit(limit)
  );
}

/** Guarda una generación válida y devuelve la fila. */
export async function createGeneration(fields) {
  return unwrap(await supabase.from(AI_GENERATIONS_TABLE).insert(fields).select(GENERATION_COLUMNS).single());
}

/** Generación por id, o null si no existe. */
export async function findGenerationById(id) {
  return unwrap(
    await supabase.from(AI_GENERATIONS_TABLE).select(GENERATION_COLUMNS).eq('id', id).maybeSingle()
  );
}

/**
 * Crea las plantillas de la generación y la marca como usada en una sola transacción
 * (función SQL): o quedan todas o ninguna. Devuelve las plantillas en el orden recibido.
 * Si otra request la guardó antes → 409; si no existe o es de otro trainer → 404.
 */
export async function saveGenerationTemplates(generationId, trainerId, templates) {
  const { data, error } = await supabase.rpc('save_ai_generation_templates', {
    p_generation_id: generationId,
    p_trainer_id: trainerId,
    p_templates: templates,
  });
  if (error?.code === ALREADY_SAVED) throw Errors.generationAlreadySaved();
  if (error?.code === NOT_FOUND) throw Errors.generationNotFound();
  if (error) throw Errors.internal(error.message);
  return data;
}
