import { Errors } from '../../shared/utils/errors.js';
import { DAYS } from '../../models/routines/routine.model.js';

/**
 * Validación de la propuesta que devuelve n8n (la IA no es confiable): esquema, tipos,
 * días y que cada ejercicio esté en la biblioteca que se mandó. Cualquier falla → 502
 * AI_INVALID_RESPONSE sin detalles para el cliente (van al log). Los campos de más se descartan.
 */
const MAX_BLOCKS = 7;
const MAX_EXERCISES = 15;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isIntBetween = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const isTextBetween = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
const isKg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 500;

function cleanExercise(raw, path, ctx) {
  if (!isObject(raw)) return ctx.problems.push(`${path}: no es un objeto`) && null;
  const { exercise_id, sets, reps, rest_seconds } = raw;
  const suggested_kg = raw.suggested_kg ?? null;
  const notes = raw.notes ?? null;
  if (!ctx.libraryIds.has(exercise_id)) ctx.problems.push(`${path}.exercise_id: no está en la biblioteca`);
  if (!isIntBetween(sets, 1, 10)) ctx.problems.push(`${path}.sets: entero de 1 a 10`);
  if (!isIntBetween(reps, 1, 50)) ctx.problems.push(`${path}.reps: entero de 1 a 50`);
  if (!isIntBetween(rest_seconds, 0, 600)) ctx.problems.push(`${path}.rest_seconds: entero de 0 a 600`);
  if (suggested_kg !== null && !isKg(suggested_kg)) ctx.problems.push(`${path}.suggested_kg: null o 0 a 500`);
  if (notes !== null && !isTextBetween(notes, 0, 200)) ctx.problems.push(`${path}.notes: hasta 200 caracteres`);
  return {
    exercise_id,
    sets,
    reps,
    rest_seconds,
    suggested_kg,
    notes: typeof notes === 'string' ? notes.trim() || null : null,
  };
}

function cleanBlock(raw, path, ctx) {
  if (!isObject(raw)) return ctx.problems.push(`${path}: no es un objeto`) && null;
  const { name, days, exercises } = raw;
  if (!isTextBetween(name, 1, 60)) ctx.problems.push(`${path}.name: de 1 a 60 caracteres`);
  const validDays =
    Array.isArray(days) && days.length > 0 && days.every((d) => DAYS.includes(d)) && new Set(days).size === days.length;
  if (!validDays) ctx.problems.push(`${path}.days: al menos 1, sin repetidos, de monday a sunday`);
  else {
    for (const day of days) {
      if (ctx.usedDays.has(day)) ctx.problems.push(`${path}.days: ${day} se repite entre bloques`);
      ctx.usedDays.add(day);
    }
  }
  let items = [];
  if (!Array.isArray(exercises) || exercises.length < 1 || exercises.length > MAX_EXERCISES) {
    ctx.problems.push(`${path}.exercises: de 1 a ${MAX_EXERCISES}`);
  } else items = exercises.map((e, i) => cleanExercise(e, `${path}.exercises[${i}]`, ctx));
  return { name: typeof name === 'string' ? name.trim() : name, days, exercises: items };
}

/** Propuesta saneada; lanza 502 AI_INVALID_RESPONSE si no cumple el esquema. */
export function validateProposal(raw, { frequency, libraryIds }) {
  const ctx = { problems: [], usedDays: new Set(), libraryIds };
  let routines = [];
  if (!isObject(raw)) ctx.problems.push('la respuesta no es un objeto');
  else if (!Array.isArray(raw.routines) || raw.routines.length < 1 || raw.routines.length > MAX_BLOCKS) {
    ctx.problems.push(`routines: de 1 a ${MAX_BLOCKS} bloques`);
  } else {
    routines = raw.routines.map((r, i) => cleanBlock(r, `routines[${i}]`, ctx));
    if (ctx.problems.length === 0 && ctx.usedDays.size !== frequency) {
      ctx.problems.push(`routines: ${ctx.usedDays.size} días en total y la frecuencia es ${frequency}`);
    }
  }
  if (isObject(raw) && !isTextBetween(raw.rationale, 1, 1000)) {
    ctx.problems.push('rationale: de 1 a 1000 caracteres');
  }
  if (ctx.problems.length > 0) {
    console.warn('[trainer-ai] propuesta inválida de n8n', ctx.problems);
    throw Errors.aiInvalidResponse();
  }
  return { routines, rationale: raw.rationale.trim() };
}
