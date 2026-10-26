import { EMPTY_ROUTINE, makeExercise } from '@/utils/routines/editorState';

export const DRAFT_KEY = (trainerId) => `fittrainer.routine-draft.${trainerId}`;

/** JSON del borrador: sin `key` ni datos del ejercicio (solo su id). */
export function serializeDraft(state) {
  const { name, goal, days, templateId, templateName } = state;
  const exercises = state.exercises.map((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'key')));
  return JSON.stringify({ name, goal, days, templateId, templateName, exercises });
}

/** `{ state, missing }` desde el JSON guardado, o `null` si no se puede leer. */
export function restoreDraft(raw, exercisesById) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.exercises)) return null;
  const kept = data.exercises.filter((e) => e && exercisesById.has(e.exercise_id));
  return {
    missing: data.exercises.length - kept.length,
    state: {
      ...EMPTY_ROUTINE,
      name: data.name ?? '',
      goal: data.goal ?? '',
      days: Array.isArray(data.days) ? data.days : [],
      templateId: data.templateId ?? null,
      templateName: data.templateName ?? null,
      exercises: kept.map((e) => makeExercise(e.exercise_id, e)),
    },
  };
}

export function readDraft(trainerId) {
  try {
    return localStorage.getItem(DRAFT_KEY(trainerId));
  } catch {
    return null;
  }
}

export function writeDraft(trainerId, state) {
  try {
    localStorage.setItem(DRAFT_KEY(trainerId), serializeDraft(state));
  } catch {
    /* sin almacenamiento disponible: el borrador es opcional */
  }
}

export function clearDraft(trainerId) {
  try {
    localStorage.removeItem(DRAFT_KEY(trainerId));
  } catch {
    /* idem */
  }
}
