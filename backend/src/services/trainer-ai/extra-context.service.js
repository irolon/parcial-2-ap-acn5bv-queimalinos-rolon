import { findRecentRoutines } from '../../repositories/trainer-ai/ai-context.repository.js';
import { findActiveRoutinesForStudent } from '../../repositories/routines/routines.repository.js';
import { buildStudentHistory } from './history.service.js';

const byOrder = (a, b) => a.order_index - b.order_index;

/** Rutina previa de otro alumno del profe: goal, días y nombres de ejercicio en orden, sin nombre de rutina. */
function toPreviousRoutine({ goal, days, routine_exercises }) {
  return {
    goal,
    days,
    exercise_names: [...routine_exercises].sort(byOrder).map((re) => re.exercise.name),
  };
}

/** Rutina activa del alumno: sin el nombre ni las notas (el PT suele escribir ahí datos del alumno). */
function toCurrentRoutine({ goal, days, routine_exercises }) {
  return {
    goal,
    days,
    exercises: [...routine_exercises].sort(byOrder).map(({ exercise, sets, reps, suggested_kg }) => ({
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      sets,
      reps,
      suggested_kg,
    })),
  };
}

/**
 * Contexto extra para la IA del profe, sin datos personales: sus rutinas recientes con ese objetivo
 * y, si hay alumno (ya verificado), su historial y su rutina actual. Sin alumno, esas dos van en null.
 */
export async function buildExtraContext(trainerId, { goal, studentId }, now = new Date()) {
  const [previous, history, current] = await Promise.all([
    findRecentRoutines(trainerId, { goal, excludeStudentId: studentId }),
    studentId ? buildStudentHistory(studentId, now) : null,
    studentId ? findActiveRoutinesForStudent(studentId) : null,
  ]);
  return {
    previous_routines: previous.map(toPreviousRoutine),
    student_history: history,
    current_routine: current ? current.map(toCurrentRoutine) : null,
  };
}
