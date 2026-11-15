/**
 * Modelo de dominio: RoutineTemplate.
 * Estructura, enums y proyecciones puras. SIN lógica de negocio ni acceso a datos.
 */
export const ROUTINE_TEMPLATES_TABLE = 'routine_templates';

/** Vista del listado: la plantilla sin structure, con `days` y `exercise_count` calculados en la base. */
export const ROUTINE_TEMPLATES_SUMMARY_VIEW = 'routine_templates_summary';

/** Niveles válidos de una plantilla. */
export const TEMPLATE_LEVELS = ['beginner', 'intermediate', 'advanced'];

/** Versión actual del formato de `structure`. */
export const STRUCTURE_VERSION = 1;

const BASE_COLUMNS = 'id, trainer_id, name, goal, level, frequency_per_week, generated_by_ai, created_at';

/** Columnas para el detalle (con structure). */
export const TEMPLATE_DETAIL_COLUMNS = `${BASE_COLUMNS}, structure`;

/** Columnas del listado (vista routine_templates_summary, sin structure). */
export const TEMPLATE_SUMMARY_COLUMNS = `${BASE_COLUMNS}, days, exercise_count`;

/** Arreglo `field` de la structure; [] si falta o no es un arreglo (plantillas cargadas por otra vía). */
const listOf = (structure, field) => (Array.isArray(structure?.[field]) ? structure[field] : []);

/** Ejercicios de una structure, tolerante a structures incompletas (ignora ítems que no son objetos). */
export const structureExercises = (structure) =>
  listOf(structure, 'exercises').filter((e) => e && typeof e === 'object');

/** Días de una structure; [] si faltan o no son un arreglo. */
export const structureDays = (structure) => listOf(structure, 'days');

/**
 * Proyección de listado a partir de una fila de la vista routine_templates_summary:
 * mismas claves y mismo orden que la respuesta de siempre de GET /routine-templates
 * (sin trainer_id ni structure).
 */
export function toTemplateSummary(row) {
  const { id, name, goal, level, frequency_per_week, generated_by_ai, created_at, days, exercise_count } = row;
  return { id, name, goal, level, frequency_per_week, generated_by_ai, created_at, days, exercise_count };
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

/**
 * Traduce los errores de validación de una structure armada desde una rutina
 * (campos `structure.*` que el entrenador no mandó) a mensajes sobre la rutina,
 * todos con `field: 'routine_id'`.
 */
export function routineStructureDetails(details) {
  return details.map(({ field, message }) => {
    const exercise = /^structure\.exercises\[(\d+)\]/.exec(field);
    let text = message;
    if (exercise) text = `El ejercicio ${Number(exercise[1]) + 1} de la rutina: ${message}`;
    else if (field === 'structure.exercises') text = 'La rutina tiene que tener entre 1 y 50 ejercicios';
    else if (field === 'structure.days') text = `Los días de la rutina: ${message}`;
    return { field: 'routine_id', message: text };
  });
}

/** Ids únicos de los ejercicios de una structure. */
export const templateExerciseIds = (structure) => [
  ...new Set(structureExercises(structure).map((e) => e.exercise_id)),
];
