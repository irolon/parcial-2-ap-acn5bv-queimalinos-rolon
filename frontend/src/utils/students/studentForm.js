import { todayString } from '@/utils/dates';
import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { EQUIPMENT_LABELS } from '@/utils/exercises/exerciseOptions';

export const STUDENT_FIELDS = ['name', 'goal', 'level', 'birth_date', 'gym_equipment', 'injuries'];
export const MAX_EQUIPMENT = 30;
export const MAX_EQUIPMENT_LENGTH = 50;
export const MAX_INJURIES = 1000;

const NAME_ERROR = 'El nombre debe tener entre 2 y 100 caracteres';
const BIRTH_ERROR = 'La fecha no puede ser futura';

/** Valores iniciales del formulario de edición. */
export function studentFormDefaults(student) {
  return {
    name: student.name ?? '',
    goal: student.goal ?? '',
    level: student.level ?? '',
    birth_date: student.birth_date ?? '',
  };
}

/**
 * Body del PATCH con solo lo que cambió. Objetivo y nivel vacíos no se mandan (el backend no
 * admite `null`); la fecha vaciada va como `null`.
 */
export function buildStudentBody(formData, student) {
  const initial = studentFormDefaults(student);
  const text = (name) => String(formData.get(name) ?? '').trim();
  const body = {};
  if (text('name') !== initial.name) body.name = text('name');
  for (const field of ['goal', 'level']) {
    if (text(field) && text(field) !== initial[field]) body[field] = text(field);
  }
  if (text('birth_date') !== initial.birth_date) body.birth_date = text('birth_date') || null;
  return body;
}

/** `{ campo: mensaje }` para los campos presentes en `body`. */
export function validateStudentBody(body, now = new Date()) {
  const errors = {};
  if ('name' in body && (body.name.length < 2 || body.name.length > 100)) errors.name = NAME_ERROR;
  if (body.birth_date && body.birth_date > todayString(now)) errors.birth_date = BIRTH_ERROR;
  return errors;
}

/** Traduce el error de guardar a lo que muestra el formulario. */
export function toStudentErrors(error) {
  return fieldErrorsFrom(error, { fields: STUDENT_FIELDS, fallback: 'No pudimos guardar los cambios' });
}

/** Body del PATCH del contexto de IA: lista vacía y texto vacío van como `null`. */
export function buildContextBody(equipment, injuries) {
  return { gym_equipment: equipment.length > 0 ? equipment : null, injuries: injuries.trim() || null };
}

const sameItem = (a, b) => {
  const norm = (value) => value.toLowerCase();
  return norm(a) === norm(b) || norm(EQUIPMENT_LABELS[a] ?? a) === norm(EQUIPMENT_LABELS[b] ?? b);
};

/** Suma un equipo libre; sin cambios (misma lista) si está vacío, repetido o se llegó al tope. */
export function addEquipment(list, text) {
  const value = text.trim().slice(0, MAX_EQUIPMENT_LENGTH);
  if (!value || list.length >= MAX_EQUIPMENT || list.some((item) => sameItem(item, value))) return list;
  return [...list, value];
}
