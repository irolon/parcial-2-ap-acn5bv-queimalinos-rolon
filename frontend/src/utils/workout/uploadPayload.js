// Qué se manda al subir una sesión y cómo se lee lo que vuelve: igual que el celular (SessionUploader.kt y
// SessionApi.kt) y contratos-api.md §Sesiones.

export const SETS_PER_BATCH = 100;

const isObject = (value) => typeof value === 'object' && value !== null;
const later = (a, b) => (Date.parse(a) >= Date.parse(b) ? a : b);
const compareText = (a, b) => (a < b ? -1 : Number(a > b));
const lower = (id) => String(id).toLowerCase();

/**
 * Body de POST /sessions con los campos y el orden de CreateSessionRequest: `rpe` y `notes` solo si hay (el celular
 * no los serializa en null). Un reloj que vuelve atrás no deja finished_at antes de started_at: el backend la rechazaría.
 */
export function sessionBody(state) {
  const body = {
    id: state.id,
    routine_id: state.routineId ?? null,
    started_at: state.startedAt,
    finished_at: state.finishedAt ? later(state.finishedAt, state.startedAt) : null,
  };
  if (state.feedback?.rpe != null) body.rpe = state.feedback.rpe;
  if (state.feedback?.notes != null) body.notes = state.feedback.notes;
  return body;
}

/**
 * Una serie de POST /sessions/:id/sets como SessionSetDto: sin sustitución en la web y peso corporal = 0 kg.
 * `rest_seconds` es el descanso real después de la serie; null si no hay (última serie, Terminar con el descanso
 * abierto, ejercicio sin descanso o sesión guardada antes de que existiera el campo).
 */
export const setBody = (set) => ({
  id: set.id,
  exercise_id: set.exerciseId,
  original_exercise_id: null,
  routine_exercise_id: set.routineExerciseId ?? null,
  set_number: set.setNumber,
  actual_reps: set.reps,
  actual_kg: set.kg ?? 0,
  executed_at: set.executedAt,
  rest_seconds: Number.isInteger(set.restSeconds) ? set.restSeconds : null,
});

/** Series que faltan subir (ni confirmadas ni rechazadas), por executedAt y después por id, como el celular. */
export function pendingSets(state) {
  const settled = new Set([...state.upload.sentSetIds, ...state.upload.failed.map((failure) => failure.id)]);
  return state.sets
    .filter((set) => !settled.has(set.id))
    .sort((a, b) => Date.parse(a.executedAt) - Date.parse(b.executedAt) || compareText(a.id, b.id));
}

/** Lotes de hasta 100 series (el máximo de POST /sessions/:id/sets). */
export const batches = (sets) =>
  Array.from({ length: Math.ceil(sets.length / SETS_PER_BATCH) }, (_, i) =>
    sets.slice(i * SETS_PER_BATCH, (i + 1) * SETS_PER_BATCH));

const sameAchievement = (a, b) => (a.id != null && a.id === b.id) || (a.code != null && a.code === b.code);

/** Suma los logros recién desbloqueados sin repetir (por id o por code). */
export function mergeUnlocked(known, incoming) {
  const merged = [...known];
  for (const item of Array.isArray(incoming) ? incoming : []) {
    if (isObject(item) && !merged.some((other) => sameAchievement(other, item))) merged.push(item);
  }
  return merged;
}

const withUpload = (state, changes) => ({ ...state, upload: { ...state.upload, ...changes } });

/** POST /sessions respondió bien (201 nueva o 200 reintento): la sesión existe en el servidor. */
export const applySession = (state, data) =>
  withUpload(state, { sessionCreated: true, unlocked: mergeUnlocked(state.upload.unlocked, data.unlocked_achievements) });

/** 404 en las series: la sesión no está, y con ella tampoco lo que se había mandado. Se vuelve a crear y a mandar todo. */
export const resetSession = (state) => withUpload(state, { sessionCreated: false, sentSetIds: [] });

/**
 * Respuesta de un lote: las `saved` (los ids vuelven en minúscula) pasan a confirmadas; las `failed` son rechazos
 * permanentes, que se ubican por `index` en el lote como hace el celular (o por id) y no se vuelven a mandar.
 */
export function applyBatch(state, batch, data) {
  const local = new Map(batch.map((set) => [lower(set.id), set.id]));
  const sent = new Set(state.upload.sentSetIds);
  for (const item of Array.isArray(data.saved) ? data.saved : []) {
    if (local.has(lower(item?.id))) sent.add(local.get(lower(item.id)));
  }
  const failed = new Map(state.upload.failed.map((failure) => [failure.id, failure]));
  for (const item of Array.isArray(data.failed) ? data.failed : []) {
    const id = batch[item?.index]?.id ?? local.get(lower(item?.id));
    if (id && !sent.has(id) && !failed.has(id)) failed.set(id, { id, code: item.code ?? 'UNKNOWN' });
  }
  return withUpload(state, {
    sentSetIds: [...sent],
    failed: [...failed.values()],
    unlocked: mergeUnlocked(state.upload.unlocked, data.unlocked_achievements),
  });
}
