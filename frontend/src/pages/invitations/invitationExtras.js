import { todayString } from '@/utils/dates';

// Datos extra de la invitación: frecuencia, altura, peso, nacimiento y contexto para la IA.
// Mismos rangos que valida el backend (validations/invitations/invitation-extras.validation.js).
export const HEIGHT_RANGE = { min: 50, max: 250 };
export const WEIGHT_RANGE = { min: 20, max: 300 };
const MIN_BIRTH_DATE = '1900-01-01';

export const EXTRA_FIELDS = ['weekly_frequency', 'height_cm', 'weight_kg', 'birth_date', 'gym_equipment', 'injuries'];

const text = (data, name) => String(data.get(name) ?? '').trim();
/** Número del campo (acepta coma decimal); `NaN` si no se entiende, para que lo marque la validación. */
const number = (value) => Number(value.replace(',', '.'));

/** Los datos extra del formulario; los vacíos no se mandan. */
export function buildInvitationExtras(formData) {
  const body = {};
  const frequency = text(formData, 'weekly_frequency');
  if (frequency) body.weekly_frequency = Number(frequency);
  for (const field of ['height_cm', 'weight_kg']) {
    const value = text(formData, field);
    if (value) body[field] = number(value);
  }
  const birthDate = text(formData, 'birth_date');
  if (birthDate) body.birth_date = birthDate;
  const equipment = formData.getAll('gym_equipment').map(String);
  if (equipment.length > 0) body.gym_equipment = equipment;
  const injuries = text(formData, 'injuries');
  if (injuries) body.injuries = injuries;
  return body;
}

const outside = (value, { min, max }) => value !== undefined && !(value >= min && value <= max);

/** Chequeos de los datos extra que no necesitan al backend: `{ campo: mensaje }`. */
export function validateInvitationExtras(body, now = new Date()) {
  const errors = {};
  if (outside(body.height_cm, HEIGHT_RANGE)) errors.height_cm = `Entre ${HEIGHT_RANGE.min} y ${HEIGHT_RANGE.max} cm`;
  if (outside(body.weight_kg, WEIGHT_RANGE)) errors.weight_kg = `Entre ${WEIGHT_RANGE.min} y ${WEIGHT_RANGE.max} kg`;
  if (body.birth_date && body.birth_date > todayString(now)) errors.birth_date = 'La fecha no puede ser futura';
  else if (body.birth_date && body.birth_date < MIN_BIRTH_DATE) errors.birth_date = 'La fecha tiene que ser desde 1900';
  return errors;
}
