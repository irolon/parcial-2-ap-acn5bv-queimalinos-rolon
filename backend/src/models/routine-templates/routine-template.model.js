/**
 * Modelo de dominio: RoutineTemplate.
 * Estructura, enums y proyecciones puras. SIN lógica de negocio ni acceso a datos.
 */
export const ROUTINE_TEMPLATES_TABLE = 'routine_templates';

/** Niveles válidos de una plantilla. */
export const TEMPLATE_LEVELS = ['beginner', 'intermediate', 'advanced'];

/** Versión actual del formato de `structure`. */
export const STRUCTURE_VERSION = 1;

const BASE_COLUMNS = 'id, trainer_id, name, goal, level, frequency_per_week, generated_by_ai, created_at';

/** Columnas para listados (sin el jsonb pesado). */
export const TEMPLATE_COLUMNS = BASE_COLUMNS;

/** Columnas para el detalle (con structure). */
export const TEMPLATE_DETAIL_COLUMNS = `${BASE_COLUMNS}, structure`;

/** Proyección de listado: la plantilla sin structure, con `days` y `exercise_count`. */
export function toTemplateSummary(row) {
  const { id, name, goal, level, frequency_per_week, generated_by_ai, created_at, structure } = row;
  return {
    id,
    name,
    goal,
    level,
    frequency_per_week,
    generated_by_ai,
    created_at,
    days: structure?.days ?? [],
    exercise_count: structure?.exercises?.length ?? 0,
  };
}

/**
 * Arma la `structure` de una plantilla a partir del detalle de una rutina
 * (`toRoutineDetail`): ordena por order_index y lo normaliza a `order`;
 * quita días repetidos (conserva el orden de primera aparición).
 */
export function structureFromRoutine(routineDetail) {
  return {
    version: STRUCTURE_VERSION,
    days: [...new Set(routineDetail.days)],
    exercises: routineDetail.exercises
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((e, i) => ({
        exercise_id: e.exercise.id,
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        suggested_kg: e.suggested_kg,
        tempo: e.tempo,
        notes: e.notes,
        order: i,
      })),
  };
}

/** Ids únicos de los ejercicios de una structure. */
export const templateExerciseIds = (structure) => [
  ...new Set((structure?.exercises ?? []).map((e) => e.exercise_id)),
];
