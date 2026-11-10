import { extraEquipmentNote, normalizeEquipment } from '@/utils/exercises/equipment';
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

/**
 * Lo que la ficha del alumno (`GET /students/:id`) tiene para precargar: solo los campos con datos. El equipamiento
 * (texto libre) se lleva al catálogo como el backend y lo que no mapea va a `preferences`, como hace él: con alumno la
 * web manda siempre `available_equipment`, así que el backend ya no normaliza la ficha.
 */
export function studentPrefill(student) {
  const prefill = {};
  const goal = known(GOALS, student.goal);
  const level = known(LEVELS, student.level);
  const { codes, unmapped } = normalizeEquipment(student.gym_equipment);
  const note = extraEquipmentNote(unmapped);
  if (goal) prefill.goal = goal;
  if (level) prefill.level = level;
  if (codes.length > 0) prefill.equipment = codes;
  if (student.injuries?.trim()) prefill.injuries = student.injuries;
  if (note) prefill.preferences = note;
  return prefill;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const NOTE_JOIN = '. ';

const hasNote = (text, note) => text.trim() === note || text.trim().endsWith(`${NOTE_JOIN}${note}`);
/** Preferencias con la nota del equipamiento extra: si el PT ya escribió algo, se suma al final (no lo pisa). */
const withNote = (text, note) => {
  if (hasNote(text, note)) return text;
  return text.trim() ? `${text.trim()}${NOTE_JOIN}${note}` : note;
};
/** Preferencias sin la nota de un alumno anterior: sola o sumada al final de lo que escribió el PT. */
const withoutNote = (text, note) => (text.endsWith(`${NOTE_JOIN}${note}`) ? text.slice(0, -(note.length + NOTE_JOIN.length)) : text);

/**
 * Formulario sin la precarga de un alumno (`previous`, de `studentPrefill`): lo que vino de él y el PT no tocó vuelve
 * a vacío; la nota del equipamiento extra se saca aunque el PT haya escrito antes otras preferencias.
 */
export function clearPrefill(form, previous = {}) {
  const next = { ...form };
  for (const [field, value] of Object.entries(previous)) {
    if (same(next[field], value)) next[field] = DEFAULT_FORM[field];
    else if (field === 'preferences') next.preferences = withoutNote(next.preferences, value);
  }
  return next;
}

/**
 * Formulario con el alumno elegido: pisa solo lo que su ficha tiene; lo demás de `base` se conserva. `previous` es la
 * precarga del alumno anterior (se vacía, ver `clearPrefill`) y `touched`, los campos que el PT editó desde que eligió
 * a este alumno: esos no se pisan (p. ej. lo escrito mientras la ficha no cargaba). Las preferencias nunca se pisan:
 * la nota del equipamiento extra se suma a lo escrito.
 */
export function formFromStudent(student, base = DEFAULT_FORM, previous = {}, touched = []) {
  const form = { ...clearPrefill(base, previous), studentId: student.id };
  for (const [field, value] of Object.entries(studentPrefill(student))) {
    if (field === 'preferences') form.preferences = withNote(form.preferences, value);
    else if (!touched.includes(field)) form[field] = value;
  }
  return form;
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

/**
 * Body de `POST /trainer-ai/generate-routine`; los textos vacíos no se mandan. Con alumno, `injuries` va siempre
 * (`null` si está vacío): el backend completa con el alumno solo lo ausente y así respeta lo que el PT borró.
 * `unloaded`: campos que no se pudieron precargar (la ficha falló) y el PT no tocó; vacíos no se mandan, así el
 * backend los completa con la ficha.
 */
export function buildGenerateBody(form, { unloaded = [] } = {}) {
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
  if (form.studentId && !body.injuries && !unloaded.includes('injuries')) body.injuries = null;
  if (unloaded.includes('equipment') && form.equipment.length === 0) delete body.available_equipment;
  return body;
}
