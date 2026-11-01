import { MAX_KG, MAX_REPS } from '@/utils/workout/workoutSets';
import { toSetKg, toSetReps } from '@/utils/workout/workoutState';
import { kgText } from '@/utils/sessions/workoutFormat';

// Los campos de peso y reps de la sesión activa: son texto mientras se escriben y recién al registrar la serie el
// motor (`toSetKg` / `toSetReps`) los convierte. Acá van los pasos de los botones, lo que se deja escribir y los avisos.

export const KG_STEP = 2.5;
export const REPS_STEP = 1;

/** Lo que se deja escribir en el peso: hasta 4 dígitos y 2 decimales, con coma o punto (es-AR escribe "62,5"). */
export const KG_INPUT = /^\d{0,4}(?:[.,]\d{0,2})?$/;

/** Lo que se deja escribir en las reps: solo dígitos (un entero). */
export const REPS_INPUT = /^\d{0,4}$/;

const round2 = (n) => Math.round(n * 100) / 100;

// El número escrito, sin topes (lo que deja KG_INPUT: dígitos y un separador decimal); NaN si no se lee.
const typedKg = (text) => Number(String(text ?? '').trim().replace(',', '.'));
const overMax = (text) => typedKg(text) > MAX_KG;

// El peso del campo como número para sumar y restar; vacío, 0 o ilegible es peso corporal (0) y arriba de 1000, 1000.
const kgOf = (text) => {
  if (overMax(text)) return MAX_KG;
  const kg = toSetKg(text);
  return kg === null || Number.isNaN(kg) ? 0 : kg;
};

/** Suma `delta` (±2,5) al peso: desde el peso corporal sube a 2,5 y al llegar a 0 vuelve a quedar vacío. */
export function stepKg(text, delta) {
  const kg = round2(Math.min(kgOf(text) + delta, MAX_KG));
  return kg > 0 ? kgText(kg) : '';
}

/** Suma `delta` (±1) a las reps, entre 0 y 1000; un campo vacío empieza de 0. */
export function stepReps(text, delta) {
  const reps = toSetReps(text) ?? 0;
  return String(Math.min(Math.max(reps + delta, 0), MAX_REPS));
}

/** Al salir del campo: "62," → "62", "0" → vacío. Lo ilegible y lo que pasa de 1000 ("1250") se deja para avisarlo. */
export function cleanKgText(text) {
  const kg = toSetKg(text);
  return Number.isNaN(kg) ? text : kgText(kg);
}

/** Al salir del campo: "0010" → "10", "5000" → "1000". Vacío sigue vacío. */
export function cleanRepsText(text) {
  const reps = toSetReps(text);
  return reps === null ? '' : String(reps);
}

/** Avisos de lo que no se puede registrar (`{}` si está todo bien). */
export function validateLoad(kg, reps) {
  const errors = {};
  if (overMax(kg)) errors.kg = `El peso no puede pasar de ${MAX_KG} kg.`;
  else if (Number.isNaN(toSetKg(kg))) errors.kg = 'Escribí el peso como número, por ejemplo 62,5.';
  if (toSetReps(reps) === null) errors.reps = 'Escribí las repeticiones como un número entero.';
  return errors;
}
