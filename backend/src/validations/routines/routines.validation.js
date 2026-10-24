import { Errors } from '../../shared/utils/errors.js';
import { ROUTINE_GOALS, DAYS } from '../../models/routines/routine.model.js';
import {
  isUuid,
  validateExerciseItem,
  validateExerciseFields,
} from './routine-exercise.validation.js';

const isString = (v) => typeof v === 'string';
const trimmed = (v) => (isString(v) ? v.trim() : v);

function validateExercisesArray(exercises, details) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    details.push({ field: 'exercises', message: 'Debe incluir al menos un ejercicio' });
    return [];
  }
  return exercises.map((e, i) => validateExerciseItem(e, `exercises[${i}]`, details));
}

/** Body de POST /routines. */
export function validateCreateRoutine(body) {
  const details = [];
  const name = trimmed(body.name);

  if (!isUuid(body.student_id)) {
    details.push({ field: 'student_id', message: 'student_id inválido' });
  }
  if (body.template_id !== undefined && body.template_id !== null && !isUuid(body.template_id)) {
    details.push({ field: 'template_id', message: 'template_id inválido' });
  }
  if (!isString(name) || name.length < 2 || name.length > 120) {
    details.push({ field: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' });
  }
  if (!ROUTINE_GOALS.includes(body.goal)) {
    details.push({ field: 'goal', message: `goal debe ser uno de: ${ROUTINE_GOALS.join(', ')}` });
  }
  if (!Array.isArray(body.days) || body.days.length === 0 || !body.days.every((d) => DAYS.includes(d))) {
    details.push({ field: 'days', message: `days debe ser un arreglo no vacío de: ${DAYS.join(', ')}` });
  }
  const exercises = validateExercisesArray(body.exercises, details);

  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return {
    student_id: body.student_id,
    template_id: body.template_id ?? null,
    name,
    goal: body.goal,
    days: body.days,
    exercises,
  };
}

/** Body de POST /routines/:id/exercises. */
export function validateAddExercises(body) {
  const details = [];
  const exercises = validateExercisesArray(body.exercises, details);
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return { exercises };
}

/** Body de PATCH /routines/:id — al menos un campo, solo los permitidos. */
export function validateUpdateRoutine(body) {
  const details = [];
  const out = {};

  if (body.name !== undefined) {
    const name = trimmed(body.name);
    if (!isString(name) || name.length < 2 || name.length > 120) {
      details.push({ field: 'name', message: 'El nombre debe tener entre 2 y 120 caracteres' });
    } else out.name = name;
  }
  if (body.goal !== undefined) {
    if (!ROUTINE_GOALS.includes(body.goal)) {
      details.push({ field: 'goal', message: `goal debe ser uno de: ${ROUTINE_GOALS.join(', ')}` });
    } else out.goal = body.goal;
  }
  if (body.days !== undefined) {
    if (!Array.isArray(body.days) || body.days.length === 0 || !body.days.every((d) => DAYS.includes(d))) {
      details.push({ field: 'days', message: `days debe ser un arreglo no vacío de: ${DAYS.join(', ')}` });
    } else out.days = body.days;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      details.push({ field: 'active', message: 'active debe ser booleano' });
    } else out.active = body.active;
  }

  if (Object.keys(out).length === 0) {
    details.push({ field: 'body', message: 'Enviá al menos un campo para actualizar' });
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}

/** Filtros de GET /routines. */
export function validateListQuery(query) {
  const details = [];
  const out = {};
  if (query.student_id !== undefined) {
    if (!isUuid(query.student_id)) details.push({ field: 'student_id', message: 'student_id inválido' });
    else out.studentId = query.student_id;
  }
  if (query.active !== undefined) out.active = query.active !== 'false';
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}

/** Body de PATCH /routines/:id/exercises/:routineExerciseId — al menos un campo. */
export function validateUpdateRoutineExercise(body) {
  const details = [];
  const out = validateExerciseFields(body ?? {}, details, { partial: true });
  if (details.length === 0 && Object.keys(out).length === 0) {
    details.push({ field: 'body', message: 'Enviá al menos un campo para actualizar' });
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return out;
}

/** Valida :id y :routineExerciseId de la ruta (UUID). */
export function validateRoutineExerciseParams(params) {
  const details = [];
  for (const field of ['id', 'routineExerciseId']) {
    if (!isUuid(params[field])) details.push({ field, message: `${field} inválido` });
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return { id: params.id, routineExerciseId: params.routineExerciseId };
}

/** Valida el :id de la ruta (UUID). */
export function validateIdParam(params) {
  if (!isUuid(params.id)) {
    throw Errors.validation('Error de validación', [{ field: 'id', message: 'id inválido' }]);
  }
  return { id: params.id };
}
