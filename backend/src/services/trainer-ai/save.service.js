import { Errors } from '../../shared/utils/errors.js';
import * as generationsRepository from '../../repositories/trainer-ai/ai-generations.repository.js';
import { findMissingExerciseIds } from '../routines/routines.service/routines.service.js';
import { structureDays } from '../../models/routine-templates/routine-template.model.js';
import {
  templateNameFor,
  blockStructure,
  proposalExerciseIds,
} from '../../models/trainer-ai/ai-generation.model.js';

/** Generación propia y sin guardar; 404 si no existe o es ajena (no revela su existencia), 409 si ya se guardó. */
async function getUnsavedGeneration(trainerId, generationId) {
  const generation = await generationsRepository.findGenerationById(generationId);
  if (!generation || generation.trainer_id !== trainerId) throw Errors.generationNotFound();
  if (generation.was_used) throw Errors.generationAlreadySaved();
  return generation;
}

/**
 * POST /trainer-ai/save-as-template: una plantilla (generated_by_ai) por bloque de la
 * propuesta. Revalida los ejercicios (400 si alguno dejó de estar disponible) y crea todo
 * en una transacción SQL que además marca la generación: o quedan todas o ninguna.
 */
export async function saveAsTemplate(trainerId, { generation_id, template_name }) {
  const generation = await getUnsavedGeneration(trainerId, generation_id);
  const proposal = generation.generated_routine;

  const missing = await findMissingExerciseIds(trainerId, proposalExerciseIds(proposal));
  if (missing.length > 0) throw Errors.templateExercisesUnavailable(missing, 400);

  const blocks = proposal.routines;
  const templates = blocks.map((block) => ({
    name: templateNameFor(template_name, block.name, blocks.length),
    goal: generation.input_params.goal,
    level: generation.input_params.level ?? null,
    frequency_per_week: block.days.length,
    structure: blockStructure(block),
  }));
  const rows = await generationsRepository.saveGenerationTemplates(generation.id, trainerId, templates);
  return {
    generation_id: generation.id,
    templates: rows.map((t) => ({ id: t.id, name: t.name, days: structureDays(t.structure) })),
  };
}
