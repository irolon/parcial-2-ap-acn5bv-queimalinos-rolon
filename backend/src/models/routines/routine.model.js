/**
 * Modelo de dominio: Routine + RoutineExercise.
 * Estructura, enums y helpers puros. SIN lógica de negocio ni acceso a datos.
 */

import { round1 } from '../../shared/utils/numbers.js';
import { TIMEZONE } from '../../shared/utils/dates/dates.js';

export const ROUTINES_TABLE = 'routines';
export const ROUTINE_EXERCISES_TABLE = 'routine_exercises';

/** Objetivos válidos de una rutina. */
export const ROUTINE_GOALS = ['tonify', 'weight_loss', 'hypertrophy', 'strength'];

/** Días válidos (en inglés, como en el resto del dominio). */
export const DAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const ROUTINE_COLUMNS =
  'id, trainer_id, student_id, template_id, name, goal, days, active, created_at';

// `order` es palabra reservada en SQL → la columna se llama order_index.
export const ROUTINE_EXERCISE_COLUMNS =
  'id, routine_id, exercise_id, sets, reps, rest_seconds, suggested_kg, tempo, notes, order_index';

/** ¿La rutina pertenece a este trainer? */
export const isOwnedBy = (routine, trainerId) => routine?.trainer_id === trainerId;

// El VPS corre en UTC pero el día lo define Buenos Aires (un domingo 22:30 no es 'monday').
// La constante vive en shared y se re-exporta por compatibilidad.
export { TIMEZONE };

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  weekday: 'long',
});

/** Nombre del día actual (o de una fecha dada) en el formato del dominio. */
export const dayName = (date = new Date()) => weekdayFormatter.format(date).toLowerCase();

/** Ordena y normaliza los ejercicios embebidos de una rutina. */
export function mapRoutineExercises(routineExercises = []) {
  return routineExercises
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((re) => ({
      routine_exercise_id: re.id,
      exercise: re.exercise,
      sets: re.sets,
      reps: re.reps,
      rest_seconds: re.rest_seconds,
      suggested_kg: re.suggested_kg,
      tempo: re.tempo,
      notes: re.notes,
      order_index: re.order_index,
    }));
}

/**
 * Proyección para GET /routines/today: la rutina del día con sus ejercicios.
 * `last_session_kg` sale de `lastKgByExercise` ({ [exercise_id]: kg }); null si
 * el alumno nunca hizo el ejercicio o no cargó peso.
 */
export function toTodayRoutine(row, lastKgByExercise = {}) {
  if (!row) return null;
  const exercises = mapRoutineExercises(row.routine_exercises).map((e) => ({
    ...e,
    last_session_kg: round1(lastKgByExercise[e.exercise?.id]),
  }));
  return { routine_id: row.id, name: row.name, goal: row.goal, days: row.days, exercises };
}

/** Proyección para GET /routines/:id: la rutina completa con sus ejercicios. */
export function toRoutineDetail(row) {
  if (!row) return null;
  const { routine_exercises: re, ...routine } = row;
  return { ...routine, exercises: mapRoutineExercises(re) };
}

/**
 * Proyección para GET /routines/mine: las rutinas activas del alumno con sus
 * ejercicios, para el caché offline de mobile (que resuelve el día en el teléfono).
 */
export function toStudentRoutines(rows) {
  return (rows ?? []).map((row) => ({
    routine_id: row.id,
    name: row.name,
    goal: row.goal,
    days: row.days,
    created_at: row.created_at,
    exercises: mapRoutineExercises(row.routine_exercises),
  }));
}
