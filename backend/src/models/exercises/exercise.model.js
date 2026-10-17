/**
 * Modelo de dominio: Exercise (biblioteca de ejercicios).
 * Estructura, enums y helpers puros. SIN lógica de negocio ni acceso a datos.
 */

/** Nombre de la tabla en la base de datos. */
export const EXERCISES_TABLE = 'exercises';

/** Grupos musculares válidos (no estaban listados en el DER). */
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'legs',
  'glutes',
  'biceps',
  'triceps',
  'core',
  'calves',
  'full_body',
  'cardio',
];

/** Códigos de equipamiento de la biblioteca global (los usa la IA para sustituciones; la API todavía no los exige). */
export const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band'];

/** Columnas que se exponen de un ejercicio. */
export const EXERCISE_COLUMNS =
  'id, trainer_id, name, muscle_group, equipment, description, video_url, is_global';

/** ¿El ejercicio pertenece a este trainer? (los globales tienen trainer_id null). */
export const isOwnedBy = (exercise, trainerId) => exercise?.trainer_id === trainerId;
