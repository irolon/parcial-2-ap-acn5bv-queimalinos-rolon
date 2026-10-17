import { Errors } from '../../shared/utils/errors.js';
import { MEASUREMENT_FIELDS } from '../../models/body-metrics/body-metric.model.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// ISO 8601 con zona obligatoria: "10:00" sin zona no dice en qué país se midió.
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
// Tolerancia al reloj adelantado del celular.
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

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

/**
 * Formato ISO y fecha/hora reales tal como están escritas (sin mirar la zona):
 * Date.parse no sirve solo, porque acepta "02-30" y la corre al 2 de marzo.
 */
function isRealCalendarDateTime(value) {
  const m = ISO_DATETIME_RE.exec(value);
  if (!m) return false;
  const [year, month, day, hour, minute, second] = m.slice(1).map((n) => Number(n ?? 0));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
    && hour <= 23 && minute <= 59 && second <= 59;
}

/** Valida recorded_at; devuelve el ISO normalizado o undefined (y anota el error). */
function parseRecordedAt(value, details) {
  const time = typeof value === 'string' && isRealCalendarDateTime(value) ? Date.parse(value) : NaN;
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
