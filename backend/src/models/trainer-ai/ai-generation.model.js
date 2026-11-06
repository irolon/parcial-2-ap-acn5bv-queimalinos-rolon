/**
 * Modelo de dominio: AiRoutineGeneration (propuestas del asistente IA del entrenador).
 * Constantes y proyecciones puras. SIN lógica de negocio ni acceso a datos.
 */
import { STRUCTURE_VERSION } from '../routine-templates/routine-template.model.js';

export const AI_GENERATIONS_TABLE = 'ai_routine_generations';

export const GENERATION_COLUMNS =
  'id, trainer_id, student_id, input_params, generated_routine, was_used, routine_template_id, routine_template_ids, created_at';

/** Límite de intentos de generación por trainer en la ventana (RNF de costo de la IA). */
export const GENERATION_LIMIT = 20;
export const GENERATION_WINDOW_MS = 60 * 60 * 1000;
/** Retry-After cuando ya hay una generación en curso: lo que tarda n8n como máximo (30 s). */
export const IN_PROGRESS_RETRY_SECONDS = 30;

export const DEFAULT_SESSION_MIN = 60;
export const MAX_TEXT_LENGTH = 500;
export const MAX_TEMPLATE_NAME = 120;
/** Ejercicios de la biblioteca que viajan a n8n y plantillas previas de contexto. */
export const LIBRARY_LIMIT = 200;
export const PREVIOUS_TEMPLATES = 3;

/** Segundos hasta que la generación más vieja de la ventana salga de ella (mínimo 1). */
export function retryAfterSeconds(oldestCreatedAt, now = new Date()) {
  const freeAt = new Date(oldestCreatedAt).getTime() + GENERATION_WINDOW_MS;
  return Math.max(1, Math.ceil((freeAt - now.getTime()) / 1000));
}

/** Nombre de la plantilla de un bloque: el del PT si hay un bloque; "<nombre> · <bloque>" (≤120) si hay varios. */
export function templateNameFor(templateName, blockName, blockCount) {
  if (blockCount === 1) return templateName;
  return `${templateName} · ${blockName}`.slice(0, MAX_TEMPLATE_NAME);
}

/** Structure v1 de una plantilla a partir de un bloque validado de la propuesta. */
export function blockStructure(block) {
  return {
    version: STRUCTURE_VERSION,
    days: block.days,
    exercises: block.exercises.map((e, order) => ({
      exercise_id: e.exercise_id,
      sets: e.sets,
      reps: e.reps,
      rest_seconds: e.rest_seconds,
      suggested_kg: e.suggested_kg,
      tempo: null,
      notes: e.notes,
      order,
    })),
  };
}

/** Ids únicos de los ejercicios de una propuesta. */
export const proposalExerciseIds = (proposal) => [
  ...new Set(proposal.routines.flatMap((r) => r.exercises.map((e) => e.exercise_id))),
];
