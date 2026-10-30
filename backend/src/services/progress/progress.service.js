import { Errors } from '../../shared/utils/errors.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';
import * as bodyMetricsService from '../body-metrics/body-metrics.service.js';
import * as progressRepo from '../../repositories/progress/progress.repository.js';
import { findAccessibleExerciseIds } from '../../repositories/routines/routines.repository.js';
import { findExerciseById } from '../../repositories/exercises/exercises.repository.js';
import { MEASUREMENT_FIELDS } from '../../models/body-metrics/body-metric.model.js';
import {
  toProgressPoints, computePr, defaultMetricFor, bodySummary, toOverview,
} from '../../models/progress/progress.model.js';

function resolveStudentId(user, query) {
  if (query.student_id) return query.student_id;
  if (user.role === 'student') return user.id;
  throw Errors.validation('Error de validación', [
    { field: 'student_id', message: 'student_id es requerido para el entrenador' },
  ]);
}

/**
 * GET /progress/exercise/:exerciseId — curva de carga del alumno en un ejercicio.
 * Permisos (ADR 0001): assertCanAccessStudent + el ejercicio tiene que ser
 * visible para el entrenador del alumno (global o de su biblioteca).
 */
export async function exerciseProgress(user, exerciseId, query = {}) {
  const studentId = resolveStudentId(user, query);
  const student = await assertCanAccessStudent(user, studentId);

  const visible = await findAccessibleExerciseIds([exerciseId], student.trainer_id);
  if (!visible.includes(exerciseId)) throw Errors.exerciseNotFound();
  const exercise = await findExerciseById(exerciseId);
  if (!exercise) throw Errors.exerciseNotFound();

  const rows = await progressRepo.fetchExerciseProgress({
    studentId,
    exerciseId,
    from: query.from ?? null,
    to: query.to ?? null,
  });
  const points = toProgressPoints(rows);
  return {
    exercise: { id: exercise.id, name: exercise.name, muscle_group: exercise.muscle_group },
    points,
    pr: computePr(points),
    default_metric: defaultMetricFor(points),
  };
}

/** GET /progress/body/:studentId — historial de medidas (mismo permiso que /students/:id/metrics) y resumen. */
export async function bodyProgress(user, studentId) {
  const points = await bodyMetricsService.list(user, studentId);
  return { points, summary: bodySummary(points, [...MEASUREMENT_FIELDS, 'bmi']) };
}

/**
 * GET /progress/overview — ejercicios entrenados (sin filtrar por rango) y
 * volumen semanal (con from/to) del alumno. Mismos permisos que /exercise.
 */
export async function overview(user, query = {}) {
  const studentId = resolveStudentId(user, query);
  await assertCanAccessStudent(user, studentId);
  const [exerciseRows, weekRows] = await Promise.all([
    progressRepo.fetchProgressExercises(studentId),
    progressRepo.fetchWeeklyVolume({ studentId, from: query.from ?? null, to: query.to ?? null }),
  ]);
  return toOverview(exerciseRows, weekRows);
}
