import { fieldErrorsFrom } from '@/utils/fieldErrors';
import { EQUIPMENT } from './exerciseOptions';

export const FIELDS = ['name', 'muscle_group', 'equipment', 'description', 'video_url'];

const NAME_ERROR = 'El nombre debe tener entre 2 y 120 caracteres';
const VIDEO_ERROR = 'El video debe ser un link que empiece con http:// o https:// (máximo 500 caracteres)';
const DESCRIPTION_ERROR = 'La descripción puede tener hasta 1000 caracteres';
const MUSCLE_ERROR = 'Elegí un grupo muscular';

/** Igual que el backend: http(s), hasta 500 caracteres y con host. */
function isValidVideoUrl(value) {
  if (value.length > 500 || !/^https?:\/\//i.test(value)) return false;
  try {
    return new URL(value).hostname !== '';
  } catch {
    return false;
  }
}

const text = (data, name) => String(data.get(name) ?? '').trim();
const orNull = (value) => value || null;

/** Body de `POST/PATCH /exercises` desde el formulario: se recorta y lo vacío va como `null`. */
export function buildExerciseBody(formData) {
  return {
    name: text(formData, 'name'),
    muscle_group: text(formData, 'muscle_group'),
    equipment: orNull(text(formData, 'equipment')),
    description: orNull(text(formData, 'description')),
    video_url: orNull(text(formData, 'video_url')),
  };
}

/** Chequeos que repiten los del backend para no hacer un viaje en vano. `{ campo: mensaje }`. */
export function validateExerciseBody(body) {
  const errors = {};
  if (body.name.length < 2 || body.name.length > 120) errors.name = NAME_ERROR;
  if (!body.muscle_group) errors.muscle_group = MUSCLE_ERROR;
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

/** Valores iniciales del formulario; un equipamiento desconocido arranca sin elegir. */
export function formDefaults(exercise) {
  return {
    name: exercise?.name ?? '',
    muscle_group: exercise?.muscle_group ?? '',
    equipment: EQUIPMENT.includes(exercise?.equipment) ? exercise.equipment : '',
    description: exercise?.description ?? '',
    video_url: exercise?.video_url ?? '',
  };
}
