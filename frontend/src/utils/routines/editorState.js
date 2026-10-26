export const EMPTY_ROUTINE = Object.freeze({
  name: '', goal: '', days: [], templateId: null, templateName: null, exercises: [],
});

const DEFAULTS = { sets: '3', reps: '10', rest_seconds: '90', suggested_kg: '', tempo: '', notes: '' };
const FIELDS = Object.keys(DEFAULTS);

let counter = 0;
const nextKey = () => `ex-${++counter}`;
const text = (value) => (value === null || value === undefined ? '' : String(value));

/** Ejercicio del editor: números como string del input, `key` estable para dnd/React. */
export function makeExercise(exerciseId, values = DEFAULTS) {
  const fields = Object.fromEntries(FIELDS.map((f) => [f, text(values[f])]));
  return { key: nextKey(), exercise_id: exerciseId, ...fields };
}

const mapExercises = (state, fn) => ({ ...state, exercises: fn(state.exercises) });

export function addExercise(state, exerciseId) {
  return mapExercises(state, (list) => [...list, makeExercise(exerciseId)]);
}

export function removeExercise(state, key) {
  return mapExercises(state, (list) => list.filter((e) => e.key !== key));
}

export function moveExercise(state, fromIndex, toIndex) {
  const size = state.exercises.length;
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= size || toIndex >= size) return state;
  return mapExercises(state, (list) => {
    const next = [...list];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
  });
}

export function moveBy(state, key, delta) {
  const index = state.exercises.findIndex((e) => e.key === key);
  return index < 0 ? state : moveExercise(state, index, index + delta);
}

export function updateExercise(state, key, field, value) {
  return mapExercises(state, (list) => list.map((e) => (e.key === key ? { ...e, [field]: value } : e)));
}

export function updateHeader(state, field, value) {
  return { ...state, [field]: value };
}

export function toggleDay(state, day) {
  const days = state.days.includes(day) ? state.days.filter((d) => d !== day) : [...state.days, day];
  return { ...state, days };
}

/** Estado precargado desde una plantilla; descarta los ejercicios que ya no existen. */
/** Sin datos cargados (el borrador no vale la pena). */
export function isBlank(state) {
  return state.name.trim() === '' && !state.goal && state.days.length === 0
    && state.exercises.length === 0 && !state.templateId;
}

/** `exercisesById` es la biblioteca ya cargada: esperarla antes de llamar o todo cuenta como faltante. */
export function fromTemplate(template, exercisesById = new Map()) {
  const items = template.structure?.exercises ?? [];
  const kept = items.filter((item) => item.exercise && exercisesById.has(item.exercise_id));
  return {
    missing: items.length - kept.length,
    state: {
      ...EMPTY_ROUTINE,
      name: template.name ?? '',
      goal: template.goal ?? '',
      days: [...(template.structure?.days ?? [])],
      templateId: template.id,
      templateName: template.name,
      exercises: kept.map((item) => makeExercise(item.exercise_id, item)),
    },
  };
}
