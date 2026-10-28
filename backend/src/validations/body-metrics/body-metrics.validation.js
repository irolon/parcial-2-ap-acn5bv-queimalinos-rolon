import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIsoDateTime } from '../../shared/utils/validators.js';
import { MEASUREMENT_FIELDS } from '../../models/body-metrics/body-metric.model.js';

// Tolerancia al reloj adelantado del celular.
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

/** Valida una medida; devuelve el número o undefined (y anota el error). */
function parseMeasurement(field, value, details) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    details.push({ field, message: `${field} debe ser un número mayor o igual a 0` });
    return undefined;
  }
  if (field === 'body_fat_pct' && value > 100) {
    details.push({ field, message: 'body_fat_pct no puede superar 100' });
    return undefined;
  }
  return value;
}

/** Valida recorded_at; devuelve el ISO normalizado o undefined (y anota el error). */
function parseRecordedAt(value, details) {
  const time = isIsoDateTime(value) ? Date.parse(value) : NaN;
  if (Number.isNaN(time)) {
    details.push({
      field: 'recorded_at',
      message: 'recorded_at debe ser fecha y hora ISO 8601 con zona (ej. 2026-10-17T09:30:00-03:00)',
    });
    return undefined;
  }
  if (time > Date.now() + MAX_CLOCK_SKEW_MS) {
    details.push({ field: 'recorded_at', message: 'recorded_at no puede ser futuro' });
    return undefined;
  }
  return new Date(time).toISOString();
}

/**
 * Valida el body de POST /students/:id/metrics. `id` es opcional y lo genera
 * el cliente (offline-first: reintentar no duplica). `recorded_by` y `bmi`
 * nunca se aceptan del cliente.
 */
export function validateCreateMetric(body) {
  const details = [];
  const out = {};

  if (body.id !== undefined) {
    if (!isUuid(body.id)) details.push({ field: 'id', message: 'id debe ser un UUID' });
    else out.id = body.id.toLowerCase();
  }
  for (const field of MEASUREMENT_FIELDS) {
    if (body[field] === undefined || body[field] === null) continue;
    const value = parseMeasurement(field, body[field], details);
    if (value !== undefined) out[field] = value;
  }
  if (body.recorded_at !== undefined && body.recorded_at !== null) {
    const recordedAt = parseRecordedAt(body.recorded_at, details);
    if (recordedAt !== undefined) out.recorded_at = recordedAt;
  }

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  if (!MEASUREMENT_FIELDS.some((f) => out[f] !== undefined)) {
    throw Errors.validation('Cargá al menos una medida', [
      { field: 'body', message: `Medidas posibles: ${MEASUREMENT_FIELDS.join(', ')}` },
    ]);
  }
  return out;
}

/** Valida :id y :metricId de DELETE /students/:id/metrics/:metricId (en minúsculas). */
export function validateMetricParams(params) {
  const details = [];
  if (!isUuid(params.id)) details.push({ field: 'id', message: 'id inválido' });
  if (!isUuid(params.metricId)) details.push({ field: 'metricId', message: 'metricId inválido' });
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return { id: params.id.toLowerCase(), metricId: params.metricId.toLowerCase() };
}
