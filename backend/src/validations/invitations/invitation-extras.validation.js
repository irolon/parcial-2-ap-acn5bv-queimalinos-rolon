import { isIntBetween, isRealCalendarDate } from '../../shared/utils/validators.js';
import { WEEKLY_FREQUENCY_MIN, WEEKLY_FREQUENCY_MAX } from '../../models/students/student.model.js';

/*
 * Datos extra de POST /invitations (deseable "Datos extra al invitar"): frecuencia, altura, peso y
 * fecha de nacimiento. Todos opcionales (ausente o null = sin dato). Se copian al alumno en el alta:
 * frecuencia y nacimiento a students, altura y peso como su primera medida (body_metrics).
 */

const HEIGHT_CM = { min: 50, max: 250 };
const WEIGHT_KG = { min: 20, max: 300 };
const MIN_BIRTH_DATE = '1900-01-01';

const isNumberBetween = (v, { min, max }) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

/** YYYY-MM-DD real, desde 1900 y no futura. */
export function isValidBirthDate(value) {
  return isRealCalendarDate(value) && value >= MIN_BIRTH_DATE && value <= new Date().toISOString().slice(0, 10);
}

const RULES = [
  {
    field: 'weekly_frequency',
    ok: (v) => isIntBetween(v, WEEKLY_FREQUENCY_MIN, WEEKLY_FREQUENCY_MAX),
    message: `weekly_frequency debe ser un entero de ${WEEKLY_FREQUENCY_MIN} a ${WEEKLY_FREQUENCY_MAX}`,
  },
  {
    field: 'height_cm',
    ok: (v) => isNumberBetween(v, HEIGHT_CM),
    message: `height_cm debe ser un número de ${HEIGHT_CM.min} a ${HEIGHT_CM.max}`,
  },
  {
    field: 'weight_kg',
    ok: (v) => isNumberBetween(v, WEIGHT_KG),
    message: `weight_kg debe ser un número de ${WEIGHT_KG.min} a ${WEIGHT_KG.max}`,
  },
  {
    field: 'birth_date',
    ok: isValidBirthDate,
    message: 'birth_date debe ser una fecha YYYY-MM-DD real, desde 1900 y no futura',
  },
];

/** Valida los datos extra; devuelve los cuatro (null si no vinieron) y anota los errores en `details`. */
export function parseInvitationExtras(body, details) {
  const out = {};
  for (const { field, ok, message } of RULES) {
    const value = body[field] ?? null;
    if (value !== null && !ok(value)) details.push({ field, message });
    out[field] = value;
  }
  return out;
}
