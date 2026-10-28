import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { withCount } from '@/utils/routines/routineForm';

const ROW_FIELD = /^(?:structure\.)?exercises\[(\d+)\]\.(\w+)$/;
const ROW_LEVEL = ['exercise_id', 'order'];
const ASSIGN_FIELDS = { name: ['header', 'name'], goal: ['header', 'goal'], days: ['header', 'days'] };
const TEMPLATE_FIELDS = { 'structure.days': ['header', 'days'], name: ['dialog', 'name'], goal: ['dialog', 'goal'] };

/** Reparte los detalles del 400 entre cabecera, filas y modal; lo que no tiene lugar va a `form`. */
function translate(error, state, fields, fallback) {
  const errors = { header: {}, exercises: {} };
  const dialog = {};
  const other = [];
  const targets = { header: errors.header, dialog };
  const details = error?.code === 'VALIDATION_ERROR' && Array.isArray(error.details) ? error.details : [];
  for (const { field, message } of details) {
    const row = ROW_FIELD.exec(field);
    const target = row && state.exercises[Number(row[1])];
    if (target) {
      // `exercise_id` y `order` no tienen celda: se muestran bajo el nombre del ejercicio.
      const key = ROW_LEVEL.includes(row[2]) ? 'exercise_id' : row[2];
      errors.exercises[target.key] = { ...errors.exercises[target.key], [key]: message };
    } else if (Object.hasOwn(fields, field)) {
      const [group, name] = fields[field];
      targets[group][name] = message;
    } else {
      other.push(message);
    }
  }
  const mapped = Object.keys(errors.header).length + Object.keys(errors.exercises).length + Object.keys(dialog).length;
  if (other.length > 0) {
    errors.form = other.join('. ');
  } else if (mapped === 0) {
    errors.form = fieldErrorsFrom(error, { fields: [], fallback }).form;
  }
  return { errors, dialog };
}

/** Traduce un error del backend al mismo formato que `validateRoutine`. */
export function serverErrorsFor(error, state) {
  return withCount(translate(error, state, ASSIGN_FIELDS, 'No pudimos guardar la rutina').errors);
}

/** Igual, para "Guardar como plantilla" (`structure.*`): suma `dialog` con los errores de nombre y objetivo. */
export function templateErrorsFor(error, state) {
  const { errors, dialog } = translate(error, state, TEMPLATE_FIELDS, 'No pudimos guardar la plantilla');
  return { ...withCount(errors), dialog };
}
