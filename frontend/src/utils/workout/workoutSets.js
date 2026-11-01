import { DEFAULT_REPS } from '@/utils/routines/defaults';
import { positiveKg, suggestedKg } from '@/utils/routines/suggestedKg';

// Las series de la sesión en curso: cómo se normaliza lo que carga el alumno y lo que se lee de ellas.

// Topes del backend (session-set.validation.js): una serie fuera de rango se rechazaría para siempre.
export const MAX_KG = 1000;
export const MAX_REPS = 1000;
export const MAX_SET_NUMBER = 100;

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const round = (n, decimals) => Math.round(n * 10 ** decimals) / 10 ** decimals;

/** Peso de una serie: lo positivo, hasta 1000 kg y con 2 decimales; vacío, 0 o lo que no es número = peso corporal (null). */
export function toSetKg(value) {
  const kg = positiveKg(value);
  return kg === null ? null : round(Math.min(kg, MAX_KG), 2);
}

/** Reps de una serie: entero de 0 a 1000 (0 = serie fallida), o null si no es un número. */
export function toSetReps(value) {
  const reps = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof reps === 'number' && Number.isFinite(reps) ? clamp(Math.round(reps), 0, MAX_REPS) : null;
}

/** Series registradas del ejercicio `index` (por defecto, el que está a la vista), por número. */
export function exerciseSets(state, index = state.cursor) {
  const exercise = state.exercises[index];
  if (!exercise) return [];
  return state.sets
    .filter((set) => set.routineExerciseId === exercise.routineExerciseId)
    .sort((a, b) => a.setNumber - b.setNumber);
}

/**
 * Lo que el plan propone para la serie 1 ("SUGERIDO X KG × R"): la misma regla que el plan de Hoy (`suggestedKg`:
 * la última sesión y si no el sugerido, 0 = sin peso) y las reps del plan.
 */
export function planLoad(exercise) {
  const kg = suggestedKg({ last_session_kg: exercise.lastKg, suggested_kg: exercise.suggestedKg });
  return { kg: toSetKg(kg), reps: exercise.reps };
}

/** Precarga del ejercicio a la vista (spec §3): la serie 1 sale del plan; de la 2 en adelante, la serie anterior. */
export function prefill(state) {
  const exercise = state.exercises[state.cursor];
  if (!exercise) return { kg: null, reps: DEFAULT_REPS };
  const previous = exerciseSets(state).at(-1);
  return previous ? { kg: previous.kg, reps: previous.reps } : planLoad(exercise);
}

/** Series del plan que faltan registrar. Las de más en un ejercicio no tapan las que faltan en otro. */
export function missingSets(state) {
  return state.exercises.reduce(
    (sum, exercise, index) => sum + Math.max(0, exercise.sets - exerciseSets(state, index).length),
    0,
  );
}

/**
 * Totales del resumen ("N series · X kg · Y min"), contados como el historial del backend: series con reps > 0 (sin
 * las que el servidor rechazó), volumen Σ reps × kg a 1 decimal (peso corporal = 0) y minutos redondeados entre el
 * inicio y Terminar (o `now`, si todavía no se terminó).
 */
export function totals(state, now = new Date()) {
  const rejected = new Set((state.upload?.failed ?? []).map((failure) => failure.id));
  const counted = state.sets.filter((set) => set.reps > 0 && !rejected.has(set.id));
  const volume = counted.reduce((sum, set) => sum + set.reps * (set.kg ?? 0), 0);
  const end = state.finishedAt ? Date.parse(state.finishedAt) : new Date(now).getTime();
  const minutes = Math.max(0, Math.round((end - Date.parse(state.startedAt)) / 60000));
  return { sets: counted.length, volumeKg: round(volume, 1), minutes };
}
