import { EQUIPMENT } from '@/utils/exercises/exerciseOptions';
import { ROUTINE_GOAL_OPTIONS } from '@/utils/routines/routineForm';
import { LEVEL_OPTIONS } from '@/utils/students/studentOptions';

/** Lesiones y preferencias: el mismo tope que valida el backend. */
export const MAX_AI_TEXT = 500;

/** Formulario del asistente: números como string del input, `''` = sin elegir. */
export const DEFAULT_FORM = Object.freeze({
  studentId: '',
  goal: '',
  level: '',
  frequency: '3',
  duration: '60',
  equipment: Object.freeze([]),
  injuries: '',
  preferences: '',
  baseTemplateId: '',
});

/** Mensaje de cada campo del formulario (también para los 400 del backend). */
export const FIELD_MESSAGES = {
  goal: 'Elegí un objetivo',
  level: 'Elegí un nivel',
  frequency: 'Entre 1 y 7 días',
  duration: 'Entre 20 y 180 minutos',
  injuries: `Hasta ${MAX_AI_TEXT} caracteres`,
  preferences: `Hasta ${MAX_AI_TEXT} caracteres`,
};

const GOALS = ROUTINE_GOAL_OPTIONS.map((o) => o.value);
const LEVELS = LEVEL_OPTIONS.filter((o) => o.value).map((o) => o.value);
const known = (list, value) => (list.includes(value) ? value : '');

/** Precarga desde la ficha (`GET /students/:id`): lo que no tenga queda vacío; el resto de `base` se conserva. */
export function formFromStudent(student, base = DEFAULT_FORM) {
  return {
    ...base,
    studentId: student.id,
    goal: known(GOALS, student.goal),
    level: known(LEVELS, student.level),
    equipment: (student.gym_equipment ?? []).filter((item) => EQUIPMENT.includes(item)),
    injuries: student.injuries ?? '',
  };
}

const intBetween = (value, min, max) => {
  const text = String(value).trim();
  return /^\d+$/.test(text) && Number(text) >= min && Number(text) <= max;
};

/** Errores por campo con las reglas del backend (`{}` si está bien). */
export function validateAiForm(form) {
  const checks = {
    goal: GOALS.includes(form.goal),
    level: LEVELS.includes(form.level),
    frequency: intBetween(form.frequency, 1, 7),
    duration: intBetween(form.duration, 20, 180),
    injuries: form.injuries.trim().length <= MAX_AI_TEXT,
    preferences: form.preferences.trim().length <= MAX_AI_TEXT,
  };
  return Object.fromEntries(Object.entries(checks).filter(([, ok]) => !ok).map(([field]) => [field, FIELD_MESSAGES[field]]));
}

/** Body de `POST /trainer-ai/generate-routine`; los textos vacíos no se mandan. */
export function buildGenerateBody(form) {
  const body = {};
  if (form.studentId) body.student_id = form.studentId;
  if (form.baseTemplateId) body.base_template_id = form.baseTemplateId;
  Object.assign(body, {
    goal: form.goal,
    level: form.level,
    frequency_per_week: Number(form.frequency),
    session_duration_min: Number(form.duration),
    available_equipment: [...form.equipment],
  });
  for (const field of ['injuries', 'preferences']) {
    if (form[field].trim()) body[field] = form[field].trim();
  }
  return body;
}
