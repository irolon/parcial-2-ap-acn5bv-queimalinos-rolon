import { Errors } from '../../shared/utils/errors.js';
import * as bodyMetricsRepo from '../../repositories/body-metrics/body-metrics.repository.js';
import { toBodyMetric, withBmiHistory } from '../../models/body-metrics/body-metric.model.js';
import { assertCanAccessStudent } from '../students/student-access.service.js';

/**
 * Agrega el IMC a una medida. Si no trae altura usa la última registrada en o
 * antes de su recorded_at (una consulta más solo en ese caso).
 */
export async function resolveBmi(row) {
  const fallbackHeight =
    row.height_cm ?? (await bodyMetricsRepo.findLatestHeightCm(row.student_id, row.recorded_at));
  return toBodyMetric(row, fallbackHeight);
}

/** Medida más reciente del alumno con IMC, o null (latest_metrics de la ficha). */
export async function latestForStudent(studentId) {
  const latest = await bodyMetricsRepo.findLatestMetric(studentId);
  return latest ? resolveBmi(latest) : null;
}

/** GET /students/:id/metrics — historial ascendente con IMC. */
export async function list(user, studentId) {
  await assertCanAccessStudent(user, studentId);
  const rows = await bodyMetricsRepo.findMetricsByStudent(studentId);
  return withBmiHistory(rows);
}

/**
 * POST /students/:id/metrics — trainer dueño o el propio alumno. recorded_by
 * sale del rol del usuario. Si el id del cliente ya existe para este alumno es
 * un reintento (offline-first): devuelve lo guardado con created = false.
 */
export async function create(user, studentId, fields) {
  await assertCanAccessStudent(user, studentId);

  const inserted = await bodyMetricsRepo.insertMetric({
    ...fields,
    student_id: studentId,
    recorded_by: user.role,
  });
  if (inserted) return { metric: await resolveBmi(inserted), created: true };

  const existing = await bodyMetricsRepo.findMetricById(fields.id);
  if (!existing || existing.student_id !== studentId) throw Errors.metricIdConflict();
  return { metric: await resolveBmi(existing), created: false };
}

/**
 * DELETE /students/:id/metrics/:metricId — el trainer dueño borra cualquiera;
 * el alumno, solo las que cargó él. Una medida que no es de este alumno es 404.
 */
export async function remove(user, studentId, metricId) {
  await assertCanAccessStudent(user, studentId);

  const metric = await bodyMetricsRepo.findMetricById(metricId);
  if (!metric || metric.student_id !== studentId) throw Errors.metricNotFound();
  if (user.role === 'student' && metric.recorded_by !== 'student') throw Errors.forbidden();

  await bodyMetricsRepo.deleteMetric(metricId);
}
