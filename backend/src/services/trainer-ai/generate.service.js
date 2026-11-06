import { Errors } from '../../shared/utils/errors.js';
import * as generationsRepository from '../../repositories/trainer-ai/ai-generations.repository.js';
import {
  GENERATION_LIMIT,
  GENERATION_WINDOW_MS,
  retryAfterSeconds,
} from '../../models/trainer-ai/ai-generation.model.js';
import { resolveParams, buildContext } from './context.service.js';
import { requestRoutineProposal } from './n8n.client.js';
import { validateProposal } from './proposal.js';

/**
 * 429 si el trainer ya tiene GENERATION_LIMIT generaciones guardadas en la última hora.
 * Se cuenta en la base (sobrevive a un reinicio); las fallidas no se guardan y no cuentan.
 */
async function assertUnderLimit(trainerId, now) {
  const since = new Date(now.getTime() - GENERATION_WINDOW_MS).toISOString();
  const rows = await generationsRepository.findGenerationTimesSince(trainerId, since, GENERATION_LIMIT);
  if (rows.length >= GENERATION_LIMIT) {
    throw Errors.rateLimitExceeded(retryAfterSeconds(rows[0].created_at, now));
  }
}

/** La propuesta con el nombre de cada ejercicio (sale de la biblioteca que se mandó). */
function withExerciseNames(proposal, library) {
  const names = new Map(library.map((e) => [e.id, e.name]));
  return {
    routines: proposal.routines.map((block) => ({
      ...block,
      exercises: block.exercises.map(({ exercise_id, ...rest }) => ({
        exercise_id,
        exercise_name: names.get(exercise_id),
        ...rest,
      })),
    })),
    rationale: proposal.rationale,
  };
}

/**
 * POST /trainer-ai/generate-routine: resuelve los parámetros, arma el contexto sin datos
 * personales, pide la propuesta a n8n, la valida contra el esquema y la biblioteca y la
 * guarda. La IA nunca asigna: la propuesta queda para revisar y guardar como plantilla.
 */
export async function generateRoutine(trainerId, body, now = new Date()) {
  await assertUnderLimit(trainerId, now);
  const params = await resolveParams(trainerId, body);
  const context = await buildContext(trainerId, params, body.base_template_id);

  const raw = await requestRoutineProposal({ params, ...context });
  const proposal = validateProposal(raw, {
    frequency: params.frequency_per_week,
    libraryIds: new Set(context.library.map((e) => e.id)),
  });

  const generation = await generationsRepository.createGeneration({
    trainer_id: trainerId,
    student_id: body.student_id ?? null,
    input_params: { ...params, base_template_id: body.base_template_id ?? null },
    generated_routine: proposal,
  });
  return { generation_id: generation.id, routine_proposal: withExerciseNames(proposal, context.library) };
}
