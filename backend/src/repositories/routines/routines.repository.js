import { supabase } from '../../shared/supabase.js';
import { Errors } from '../../shared/utils/errors.js';
import { STUDENTS_TABLE } from '../../models/students/student.model.js';
import { EXERCISES_TABLE } from '../../models/exercises/exercise.model.js';
import {
  ROUTINES_TABLE,
  ROUTINE_EXERCISES_TABLE,
  ROUTINE_COLUMNS,
  ROUTINE_EXERCISE_COLUMNS,
} from '../../models/routines/routine.model.js';

const TEMPLATES_TABLE = 'routine_templates';

/** ¿El alumno pertenece a este trainer? */
export async function isStudentOfTrainer(studentId, trainerId) {
  const { data, error } = await supabase
    .from(STUDENTS_TABLE)
    .select('id')
    .eq('id', studentId)
    .eq('trainer_id', trainerId)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return Boolean(data);
}

/** Busca una plantilla por id (para validar existencia y ownership). */
export async function findTemplateById(templateId) {
  const { data, error } = await supabase
    .from(TEMPLATES_TABLE)
    .select('id, trainer_id')
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/**
 * De los ejercicios pedidos, devuelve los ids que el trainer puede usar:
 * globales o de su biblioteca. Los ajenos o inexistentes quedan afuera.
 */
export async function findAccessibleExerciseIds(exerciseIds, trainerId) {
  const { data, error } = await supabase
    .from(EXERCISES_TABLE)
    .select('id')
    .in('id', exerciseIds)
    .or(`is_global.eq.true,trainer_id.eq.${trainerId}`);
  if (error) throw Errors.internal(error.message);
  return data.map((row) => row.id);
}

/** Crea una rutina (activa) y devuelve la fila. */
export async function createRoutine(fields) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .insert(fields)
    .select(ROUTINE_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Inserta ejercicios en una rutina (batch) y los devuelve. */
export async function addRoutineExercises(routineId, exercises) {
  const rows = exercises.map((e, i) => ({
    routine_id: routineId,
    exercise_id: e.exercise_id,
    sets: e.sets,
    reps: e.reps,
    rest_seconds: e.rest_seconds,
    suggested_kg: e.suggested_kg,
    tempo: e.tempo,
    notes: e.notes,
    order_index: e.order ?? i,
  }));
  const { data, error } = await supabase
    .from(ROUTINE_EXERCISES_TABLE)
    .insert(rows)
    .select(ROUTINE_EXERCISE_COLUMNS);
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Lista las rutinas de un trainer, con filtros opcionales. */
export async function findRoutinesByTrainer({ trainerId, studentId, active }) {
  let query = supabase.from(ROUTINES_TABLE).select(ROUTINE_COLUMNS).eq('trainer_id', trainerId);
  if (studentId) query = query.eq('student_id', studentId);
  if (active !== undefined) query = query.eq('active', active);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca una rutina por id (para validar ownership). */
export async function findRoutineById(id) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select(ROUTINE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Busca una rutina por id con sus ejercicios embebidos (detalle). */
export async function findRoutineByIdWithExercises(id) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select(
      `${ROUTINE_COLUMNS}, routine_exercises ( ${ROUTINE_EXERCISE_COLUMNS}, ` +
        `exercise:exercise_id ( id, name, muscle_group, equipment, video_url ) )`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Actualiza campos de una rutina (nombre, goal, days, active). */
export async function updateRoutine(id, fields) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .update(fields)
    .eq('id', id)
    .select(ROUTINE_COLUMNS)
    .single();
  if (error) throw Errors.internal(error.message);
  return data;
}

/** Rutina activa del alumno cuyo days[] incluye `day`, con sus ejercicios. */
export async function findActiveRoutineForStudentToday(studentId, day) {
  const { data, error } = await supabase
    .from(ROUTINES_TABLE)
    .select(
      `${ROUTINE_COLUMNS}, routine_exercises ( ${ROUTINE_EXERCISE_COLUMNS}, ` +
        `exercise:exercise_id ( id, name, muscle_group, equipment, video_url ) )`
    )
    .eq('student_id', studentId)
    .eq('active', true)
    .contains('days', [day])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Errors.internal(error.message);
  return data;
}
