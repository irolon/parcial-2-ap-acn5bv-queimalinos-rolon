import { DEFAULT_REPS, DEFAULT_REST_SECONDS, DEFAULT_SETS } from '@/utils/routines/defaults';
import { positiveKg } from '@/utils/routines/suggestedKg';
import { closeRest, startRest } from './workoutRest';
import { MAX_REPS, MAX_SET_NUMBER, exerciseSets, toSetKg, toSetReps } from './workoutSets';

// La sesión en curso como datos puros (spec §3): cada función recibe el estado y devuelve uno nuevo, o el mismo si
// no cambia nada. Las horas son ISO absolutas, así que recargar la página no corre el descanso ni las series.
// Es la única puerta para las páginas: también re-exporta las lecturas de las series (workoutSets.js) y el descanso
// (workoutRest.js).
export {
  exerciseSets, missingSets, planLoad, prefill, toSetKg, toSetReps, totals,
} from './workoutSets';
export {
  adjustRest, closeRest, restRemaining, restTotal, skipRest, startRest,
} from './workoutRest';

const MAX_NOTES = 1000;

const iso = (time) => new Date(time).toISOString();
const intIn = (value, fallback, min, max) => (Number.isInteger(value) ? Math.min(Math.max(value, min), max) : fallback);

/** crypto.randomUUID solo existe en contextos seguros (https o localhost) y navegadores nuevos; si no, un v4 a mano. */
export function newUuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Copia de un ejercicio del plan: lo que falte, como el plan de Hoy (3 × 10 y 90 s); los pesos en 0 son "sin peso". */
const toWorkoutExercise = (item) => ({
  routineExerciseId: item.routine_exercise_id,
  exerciseId: item.exercise.id,
  name: item.exercise.name ?? 'Ejercicio',
  sets: intIn(item.sets, DEFAULT_SETS, 1, MAX_SET_NUMBER),
  reps: intIn(item.reps, DEFAULT_REPS, 0, MAX_REPS),
  restSeconds: intIn(item.rest_seconds, DEFAULT_REST_SECONDS, 0, Number.MAX_SAFE_INTEGER),
  suggestedKg: positiveKg(item.suggested_kg),
  lastKg: positiveKg(item.last_session_kg),
});

/**
 * Sesión nueva para una rutina normalizada (/routines/today o /mine), con el plan copiado: que la rutina cambie
 * después no cambia la sesión. Los ejercicios sin id se saltean (sus series no se podrían subir); sin ninguno, null.
 */
export function startWorkout(routine, { now = new Date(), newId = newUuid } = {}) {
  const exercises = (routine?.exercises ?? [])
    .filter((item) => item?.routine_exercise_id && item.exercise?.id)
    .map(toWorkoutExercise);
  if (exercises.length === 0) return null;
  return {
    id: newId(),
    routineId: routine.routine_id ?? routine.id ?? null,
    routineName: routine.name ?? '',
    startedAt: iso(now),
    finishedAt: null,
    exercises,
    sets: [],
    cursor: 0,
    restEndsAt: null,
    restTotalSeconds: null,
    restSetId: null,
    feedback: null,
    upload: { sessionCreated: false, sentSetIds: [], failed: [], unlocked: [] },
  };
}

/**
 * Registra una serie del ejercicio a la vista (`set_number` = su posición en el ejercicio) y arranca el descanso. Si
 * había uno abierto, antes lo cierra y lo anota en la serie anterior (`closeRest`).
 * Sin efecto si la sesión ya terminó, si las reps no son un número, si el peso no está vacío y es ilegible
 * (`toSetKg` da NaN) o si el ejercicio ya tiene 100 series.
 */
export function registerSet(state, { kg, reps } = {}, now = new Date(), { newId = newUuid } = {}) {
  const exercise = state.exercises[state.cursor];
  const actualReps = toSetReps(reps);
  const actualKg = toSetKg(kg);
  if (state.finishedAt || !exercise || actualReps === null || Number.isNaN(actualKg)) return state;
  const done = exerciseSets(state).length;
  if (done >= MAX_SET_NUMBER) return state;
  const rested = closeRest(state, now);
  const set = {
    id: newId(),
    exerciseId: exercise.exerciseId,
    routineExerciseId: exercise.routineExerciseId,
    setNumber: done + 1,
    reps: actualReps,
    kg: actualKg,
    executedAt: iso(now),
  };
  return startRest({ ...rested, sets: [...rested.sets, set] }, now, set.id);
}

/** Borra una serie y renumera las de su ejercicio (si se borra la 2 de 3, la 3 pasa a ser la 2). */
export function removeSet(state, setId) {
  const target = state.sets.find((set) => set.id === setId);
  if (state.finishedAt || !target) return state;
  const sets = state.sets.filter((set) => set !== target);
  const position = new Map(
    sets
      .filter((set) => set.routineExerciseId === target.routineExerciseId)
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((set, index) => [set.id, index + 1]),
  );
  return {
    ...state,
    sets: sets.map((set) => {
      const setNumber = position.get(set.id);
      return setNumber && setNumber !== set.setNumber ? { ...set, setNumber } : set;
    }),
  };
}

/** Pone a la vista el ejercicio `index`, recortado al rango. */
export function setCursor(state, index) {
  if (!Number.isInteger(index) || state.exercises.length === 0) return state;
  const cursor = Math.min(Math.max(index, 0), state.exercises.length - 1);
  return cursor === state.cursor ? state : { ...state, cursor };
}

/**
 * Terminar: fija la hora la primera vez (un reintento horas después no la cambia) y corta el descanso. El que estaba
 * abierto no se anota: después de la última serie no hay otra que esperar (en el celular queda null).
 */
export function finishWorkout(state, now = new Date()) {
  return state.finishedAt ? state : { ...state, finishedAt: iso(now), restEndsAt: null, restSetId: null };
}

/**
 * Lista para subir: terminada (si faltaba) y con el feedback decidido (si no se pidió, cuenta como "Saltar"). Así, al
 * recargar a mitad de la subida, la página no vuelve a mostrar el feedback.
 */
export function readyToUpload(state, now = new Date()) {
  const finished = finishWorkout(state, now);
  return finished.feedback ? finished : { ...finished, feedback: { rpe: null, notes: null } };
}

function validRpe(value) {
  const rpe = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(rpe) && rpe >= 1 && rpe <= 10 ? rpe : null;
}

/** Nota recortada, de hasta 1000 caracteres y sin partir un emoji; vacía, null. */
function cleanNotes(notes) {
  if (typeof notes !== 'string') return null;
  const text = notes.trim().slice(0, MAX_NOTES).replace(/[\uD800-\uDBFF]$/, '').trimEnd();
  return text || null;
}

/**
 * Feedback de "¿Qué tan dura fue?": viaja en el POST /sessions. `{}` o null es "Saltar" (queda decidido, sin nada para
 * mandar); `feedback: null` en el estado es que todavía no se pidió. Creada la sesión ya no cambia: no hay PATCH.
 */
export function setFeedback(state, feedback) {
  if (state.upload.sessionCreated) return state;
  return { ...state, feedback: { rpe: validRpe(feedback?.rpe), notes: cleanNotes(feedback?.notes) } };
}
