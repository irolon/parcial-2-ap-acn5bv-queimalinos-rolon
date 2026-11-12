import { sortDays } from '@/utils/students/routineDays';
import { EMPTY_ROUTINE, isBlank, makeExercise } from '@/utils/routines/editorState';

export const DRAFT_KEY = (trainerId) => `fittrainer.routine-draft.${trainerId}`;

/** JSON del borrador: sin `key` ni datos del ejercicio (solo su id); con la marca del bloque de la IA si salió de uno. */
export function serializeDraft(state) {
  const { name, goal, days, templateId, templateName, aiBlock } = state;
  const exercises = state.exercises.map((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== 'key')));
  return JSON.stringify({ name, goal, days, templateId, templateName, exercises, ...(aiBlock ? { aiBlock } : {}) });
}

/** La marca `{ generationId, index }` guardada, o `null` si no hay o tiene otra forma. */
const aiBlockOf = (mark) => (
  mark && typeof mark.generationId === 'string' && Number.isInteger(mark.index) && mark.index >= 0
    ? { generationId: mark.generationId, index: mark.index }
    : null
);

/**
 * `{ state, missing }` desde el JSON guardado, o `null` si no se puede leer o está vacío.
 * El llamador debe esperar a la biblioteca de ejercicios: sin ella todo cuenta como faltante.
 */
export function restoreDraft(raw, exercisesById = new Map()) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.exercises)) return null;
  const kept = data.exercises.filter((e) => e && exercisesById.has(e.exercise_id));
  const state = {
    ...EMPTY_ROUTINE,
    name: data.name ?? '',
    goal: data.goal ?? '',
    days: sortDays(Array.isArray(data.days) ? data.days : []),
    templateId: data.templateId ?? null,
    templateName: data.templateName ?? null,
    exercises: kept.map((e) => makeExercise(e.exercise_id, e)),
    aiBlock: aiBlockOf(data.aiBlock),
  };
  const blank = isBlank({ ...state, exercises: data.exercises });
  return blank ? null : { state, missing: data.exercises.length - kept.length };
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
