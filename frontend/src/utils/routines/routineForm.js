import { fieldErrorsFrom } from '@/utils/fieldErrors';

const INTEGER = /^\d+$/;
const ROW_FIELD = /^exercises\[(\d+)\]\.(\w+)$/;
const HEADER_FIELDS = ['name', 'goal', 'days'];

const blank = (value) => String(value ?? '').trim() === '';
const toNumber = (value) => (blank(value) ? null : Number(value));
const toText = (value) => (blank(value) ? null : String(value).trim());

function withCount(errors) {
  const rows = Object.values(errors.exercises).reduce((sum, row) => sum + Object.keys(row).length, 0);
  return { ...errors, count: Object.keys(errors.header).length + rows + (errors.form ? 1 : 0) };
}

function positiveInteger(value) {
  return INTEGER.test(String(value).trim()) && Number(value) > 0 ? null : 'Tiene que ser un entero mayor que 0';
}

function nonNegative(value, integer) {
  if (blank(value)) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return 'Tiene que ser un número';
  if (n < 0) return 'No puede ser negativo';
  return integer && !Number.isInteger(n) ? 'Tiene que ser un entero' : null;
}

function maxLength(value, max) {
  return String(value ?? '').trim().length > max ? `Hasta ${max} caracteres` : null;
}

function exerciseErrors(e) {
  const found = {
    sets: positiveInteger(e.sets),
    reps: positiveInteger(e.reps),
    rest_seconds: nonNegative(e.rest_seconds, true),
    suggested_kg: nonNegative(e.suggested_kg, false),
    tempo: maxLength(e.tempo, 20),
    notes: maxLength(e.notes, 500),
  };
  return Object.fromEntries(Object.entries(found).filter(([, message]) => message));
}

/** Errores del editor: cabecera, filas por `key`, `form` general y total (`count`). */
export function validateRoutine(state) {
  const header = {};
  const name = state.name.trim();
  if (name.length < 2 || name.length > 120) header.name = 'El nombre debe tener entre 2 y 120 caracteres';
  if (!state.goal) header.goal = 'Elegí un objetivo';
  if (state.days.length === 0) header.days = 'Elegí al menos un día';
  const exercises = {};
  for (const e of state.exercises) {
    const row = exerciseErrors(e);
    if (Object.keys(row).length > 0) exercises[e.key] = row;
  }
  const errors = { header, exercises };
  if (state.exercises.length === 0) errors.form = 'Agregá al menos un ejercicio';
  return withCount(errors);
}

function bodyExercises(state) {
  return state.exercises.map((e, order) => ({
    exercise_id: e.exercise_id,
    sets: Number(e.sets),
    reps: Number(e.reps),
    rest_seconds: toNumber(e.rest_seconds),
    suggested_kg: toNumber(e.suggested_kg),
    tempo: toText(e.tempo),
    notes: toText(e.notes),
    order,
  }));
}

export function buildRoutineBody(state, studentId) {
  const body = { student_id: studentId, name: state.name.trim(), goal: state.goal, days: state.days };
  if (state.templateId) body.template_id = state.templateId;
  return { ...body, exercises: bodyExercises(state) };
}

export function buildTemplateBody(state, { name, goal, level }) {
  return {
    name: name.trim(),
    goal,
    level: level || null,
    structure: { version: 1, days: state.days, exercises: bodyExercises(state) },
  };
}

/** Traduce un error del backend al mismo formato que `validateRoutine`. */
export function serverErrorsFor(error, state) {
  const errors = { header: {}, exercises: {} };
  const details = error?.code === 'VALIDATION_ERROR' && Array.isArray(error.details) ? error.details : [];
  for (const { field, message } of details) {
    const row = ROW_FIELD.exec(field);
    const target = row && state.exercises[Number(row[1])];
    if (target) {
      errors.exercises[target.key] = { ...errors.exercises[target.key], [row[2]]: message };
    } else if (HEADER_FIELDS.includes(field)) {
      errors.header[field] = message;
    }
  }
  const mapped = Object.keys(errors.header).length + Object.keys(errors.exercises).length;
  if (mapped === 0) {
    errors.form = fieldErrorsFrom(error, { fields: [], fallback: 'No pudimos guardar la rutina' }).form;
  }
  return withCount(errors);
}
