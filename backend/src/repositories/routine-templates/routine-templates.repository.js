import { supabase } from '../../config/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';
import {
  ROUTINE_TEMPLATES_TABLE,
  TEMPLATE_DETAIL_COLUMNS,
} from '../../models/routine-templates/routine-template.model.js';

/**
 * Lista las plantillas de un trainer (más nuevas primero). Trae `structure`
 * porque el resumen deriva de ahí `days` y `exercise_count`.
 */
export async function findTemplates({ trainerId, goal, level, generatedByAi }) {
  let query = supabase
    .from(ROUTINE_TEMPLATES_TABLE)
    .select(TEMPLATE_DETAIL_COLUMNS)
    .eq('trainer_id', trainerId);
  if (goal) query = query.eq('goal', goal);
  if (level) query = query.eq('level', level);
  if (generatedByAi !== undefined) query = query.eq('generated_by_ai', generatedByAi);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca una plantilla por id, con su structure. */
export async function findTemplateById(id) {
  const { data, error } = await supabase
    .from(ROUTINE_TEMPLATES_TABLE)
    .select(TEMPLATE_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Crea una plantilla y devuelve la fila. */
export async function createTemplate(fields) {
  const { data, error } = await supabase
    .from(ROUTINE_TEMPLATES_TABLE)
    .insert(fields)
    .select(TEMPLATE_DETAIL_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Actualiza campos de una plantilla y devuelve la fila. */
export async function updateTemplate(id, fields) {
  const { data, error } = await supabase
    .from(ROUTINE_TEMPLATES_TABLE)
    .update(fields)
    .eq('id', id)
    .select(TEMPLATE_DETAIL_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Borra una plantilla (las rutinas ya creadas conservan su copia: template_id → null). */
export async function deleteTemplate(id) {
  const { error } = await supabase.from(ROUTINE_TEMPLATES_TABLE).delete().eq('id', id);
  if (error) throw Errors.internal(error.message);
}

/** Datos de ejercicios por id, para hidratar el detalle de una plantilla. */
export async function findExercisesByIds(ids) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .select('id, name, muscle_group, equipment, video_url')
    .in('id', ids);
  if (error) throw Errors.internal(error.message);
  return data;
}
