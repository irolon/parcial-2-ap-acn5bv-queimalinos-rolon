import { sortDays } from '@/utils/students/routineDays';
import { GOAL_OPTIONS } from '@/utils/students/studentOptions';

const INTEGER = /^\d+$/;
const DECIMAL = /^-?(\d+([.,]\d+)?|[.,]\d+)$/;

export const MAX_EXERCISES = 50;
export const NAME_ERROR = 'El nombre debe tener entre 2 y 120 caracteres';
/** Objetivos elegibles (sin la opción vacía): cada selector agrega su propio "Elegí un objetivo". */
export const ROUTINE_GOAL_OPTIONS = GOAL_OPTIONS.filter((option) => option.value);

export const isValidName = (name) => name.trim().length >= 2 && name.trim().length <= 120;

const blank = (value) => String(value ?? '').trim() === '';
const parse = (value) => Number(String(value).trim().replace(',', '.'));
const toNumber = (value) => (blank(value) ? null : parse(value));
const toText = (value) => (blank(value) ? null : String(value).trim());

export function withCount(errors) {
  const rows = Object.values(errors.exercises).reduce((sum, row) => sum + Object.keys(row).length, 0);
  return { ...errors, count: Object.keys(errors.header).length + rows + (errors.form ? 1 : 0) };
}

function positiveInteger(value) {
  return INTEGER.test(String(value).trim()) && Number(value) > 0 ? null : 'Tiene que ser un entero mayor que 0';
}

function nonNegative(value, integer) {
  if (blank(value)) return null;
  const n = parse(value);
  if (!DECIMAL.test(String(value).trim()) || !Number.isFinite(n)) return 'Tiene que ser un número';
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
  if (!isValidName(state.name)) header.name = NAME_ERROR;
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
  const body = { student_id: studentId, name: state.name.trim(), goal: state.goal, days: sortDays(state.days) };
  if (state.templateId) body.template_id = state.templateId;
  return { ...body, exercises: bodyExercises(state) };
}

export function buildTemplateBody(state, { name, goal, level }) {
  return {
    name: name.trim(),
    goal,
    level: level || null,
    structure: { version: 1, days: sortDays(state.days), exercises: bodyExercises(state) },
  };
}
