// La sesión en curso guardada en el navegador, una por alumno (spec §3). localStorage puede fallar (modo privado,
// cuota llena, bloqueado por el navegador): todo va en try/catch y quien llama sigue con lo que tiene en memoria.

const PREFIX = 'ft.workout.';

export const workoutKey = (studentId) => `${PREFIX}${studentId}`;

/** El alumno de una clave de sesión (`ft.workout.<id>`), o null si la clave es de otra cosa. */
export const studentOfKey = (key) =>
  (typeof key === 'string' && key.startsWith(PREFIX) ? key.slice(PREFIX.length) : null);

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Un ejercicio de la copia del plan, con lo que la pantalla de la sesión lee de él (ids, nombre, series, reps y descanso;
// el peso sugerido y el de la última sesión pueden faltar o ser null: sin peso).
const isExercise = (value) => isObject(value)
  && typeof value.routineExerciseId === 'string'
  && typeof value.exerciseId === 'string'
  && typeof value.name === 'string'
  && Number.isInteger(value.sets) && value.sets >= 1
  && Number.isInteger(value.reps) && value.reps >= 0
  && Number.isInteger(value.restSeconds) && value.restSeconds >= 0;

/**
 * Lo mínimo para poder retomar la sesión; si falta algo, lo guardado no sirve y se lee como "sin sesión". Incluye que
 * el cursor apunte a un ejercicio que existe y que cada ejercicio tenga la forma que la pantalla lee: un localStorage
 * tocado a mano (o de una versión vieja) no tiene que tirar abajo la página.
 */
export function isWorkout(value) {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.startedAt === 'string'
    && Array.isArray(value.exercises) && value.exercises.length > 0 && value.exercises.every(isExercise)
    && Array.isArray(value.sets)
    && Number.isInteger(value.cursor) && value.cursor >= 0 && value.cursor < value.exercises.length
    && isObject(value.upload)
    && Array.isArray(value.upload.sentSetIds)
    && Array.isArray(value.upload.failed)
    && Array.isArray(value.upload.unlocked);
}

/** La sesión guardada del alumno, o null si no hay, no se puede leer o no es una sesión válida. */
export function loadWorkout(studentId) {
  if (!studentId) return null;
  try {
    const raw = localStorage.getItem(workoutKey(studentId));
    const value = raw ? JSON.parse(raw) : null;
    return isWorkout(value) ? value : null;
  } catch {
    return null;
  }
}

/** Guarda la sesión del alumno. `false` si no se pudo (sigue valiendo la copia en memoria). */
export function saveWorkout(studentId, state) {
  if (!studentId || !state) return false;
  try {
    localStorage.setItem(workoutKey(studentId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Borra la sesión guardada del alumno. `false` si no se pudo. */
export function clearWorkout(studentId) {
  if (!studentId) return false;
  try {
    localStorage.removeItem(workoutKey(studentId));
    return true;
  } catch {
    return false;
  }
}
