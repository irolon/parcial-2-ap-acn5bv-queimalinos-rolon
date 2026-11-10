import * as generationsRepository from '../../repositories/trainer-ai/ai-generations.repository.js';
import { GENERATION_LIMIT, GENERATION_WINDOW_MS } from '../../models/trainer-ai/ai-generation.model.js';
import { resolveParams, buildContext } from './context.service.js';
import { buildExtraContext } from './extra-context.service.js';
import { requestRoutineProposal } from './n8n.client.js';
import { validateProposal } from './proposal.js';
import { generationLimiter } from './generation-limiter.js';

/**
 * 429 si el trainer llegó al límite en la última hora: cuenta las guardadas en la base
 * (sobreviven a un reinicio) y los intentos en memoria (también los fallidos).
 */
async function assertUnderLimit(trainerId, now) {
  const since = new Date(now.getTime() - GENERATION_WINDOW_MS).toISOString();
  const rows = await generationsRepository.findGenerationTimesSince(trainerId, since, GENERATION_LIMIT);
  generationLimiter.assertUnderLimit(trainerId, rows.map((r) => r.created_at), now);
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
 * Una sola generación en curso por trainer (la segunda concurrente es 429).
 */
export async function generateRoutine(trainerId, body, now = new Date()) {
  generationLimiter.start(trainerId, now);
  try {
    return await generate(trainerId, body, now);
  } finally {
    generationLimiter.finish(trainerId);
  }
}

async function generate(trainerId, body, now) {
  await assertUnderLimit(trainerId, now);
  const params = await resolveParams(trainerId, body);
  const context = await buildContext(trainerId, params, body.base_template_id);

  const extra = await buildExtraContext(trainerId, { goal: params.goal, studentId: body.student_id ?? null }, now);

  generationLimiter.recordAttempt(trainerId, now);
  const raw = await requestRoutineProposal({ params, ...context, ...extra });
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
