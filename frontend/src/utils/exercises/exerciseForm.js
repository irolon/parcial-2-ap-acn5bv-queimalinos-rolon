import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { EQUIPMENT, EQUIPMENT_OPTIONS } from './exerciseOptions';
import { isValidVideoUrl } from './videoUrl';

export const FIELDS = ['name', 'muscle_group', 'equipment', 'description', 'video_url'];

const NAME_ERROR = 'El nombre debe tener entre 2 y 120 caracteres';
const VIDEO_ERROR = 'El video debe ser un link que empiece con http:// o https:// (máximo 500 caracteres)';
const DESCRIPTION_ERROR = 'La descripción puede tener hasta 1000 caracteres';
const MUSCLE_ERROR = 'Elegí un grupo muscular';

const orNull = (value) => value || null;

function toBody(read) {
  const text = (name) => String(read(name) ?? '').trim();
  return {
    name: text('name'),
    muscle_group: text('muscle_group'),
    equipment: orNull(text('equipment')),
    description: orNull(text('description')),
    video_url: orNull(text('video_url')),
  };
}

/** Body de `POST/PATCH /exercises` desde el formulario: se recorta y lo vacío va como `null`. */
export function buildExerciseBody(formData) {
  return toBody((name) => formData.get(name));
}

/** Body que el formulario produce sin que el usuario toque nada; base para `changedFields`. */
export function initialBody(exercise) {
  const values = formDefaults(exercise);
  return toBody((name) => values[name]);
}

/** Solo los campos de `body` que difieren de `initial` (el PATCH manda solo esos). */
export function changedFields(body, initial) {
  return Object.fromEntries(Object.entries(body).filter(([key, value]) => value !== initial[key]));
}

/** Chequeos que repiten los del backend para no hacer un viaje en vano; solo de los campos presentes en `body`. `{ campo: mensaje }`. */
export function validateExerciseBody(body) {
  const errors = {};
  if ('name' in body && (body.name.length < 2 || body.name.length > 120)) errors.name = NAME_ERROR;
  if ('muscle_group' in body && !body.muscle_group) errors.muscle_group = MUSCLE_ERROR;
  if (body.video_url && !isValidVideoUrl(body.video_url)) {
    errors.video_url = VIDEO_ERROR;
  }
  if (body.description && body.description.length > 1000) errors.description = DESCRIPTION_ERROR;
  return errors;
}

/** Traduce el error de guardar a lo que muestra el formulario. */
export function toExerciseErrors(error) {
  return fieldErrorsFrom(error, { fields: FIELDS, fallback: 'No pudimos guardar el ejercicio' });
}

/** Valores iniciales del formulario; un equipamiento desconocido se conserva tal cual. */
export function formDefaults(exercise) {
  return {
    name: exercise?.name ?? '',
    muscle_group: exercise?.muscle_group ?? '',
    equipment: exercise?.equipment ?? '',
    description: exercise?.description ?? '',
    video_url: exercise?.video_url ?? '',
  };
}

/** Opciones de equipamiento; uno desconocido del ejercicio se suma como "sin catalogar" para no perderlo. */
export function equipmentOptionsFor(exercise) {
  const unknown = exercise?.equipment;
  if (!unknown || EQUIPMENT.includes(unknown)) return EQUIPMENT_OPTIONS;
  return [...EQUIPMENT_OPTIONS, { value: unknown, label: `${unknown} (sin catalogar)` }];
}
