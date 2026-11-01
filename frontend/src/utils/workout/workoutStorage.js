// La sesión en curso guardada en el navegador, una por alumno (spec §3). localStorage puede fallar (modo privado,
// cuota llena, bloqueado por el navegador): todo va en try/catch y quien llama sigue con lo que tiene en memoria.

const PREFIX = 'ft.workout.';

export const workoutKey = (studentId) => `${PREFIX}${studentId}`;

/** El alumno de una clave de sesión (`ft.workout.<id>`), o null si la clave es de otra cosa. */
export const studentOfKey = (key) =>
  (typeof key === 'string' && key.startsWith(PREFIX) ? key.slice(PREFIX.length) : null);

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lo mínimo para poder retomar la sesión; si falta algo, lo guardado no sirve. */
export function isWorkout(value) {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.startedAt === 'string'
    && Array.isArray(value.exercises) && value.exercises.length > 0
    && Array.isArray(value.sets)
    && Number.isInteger(value.cursor)
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
