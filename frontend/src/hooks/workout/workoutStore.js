import { clearWorkout, loadWorkout, saveWorkout, studentOfKey } from '@/utils/workout/workoutStorage';

// La sesión en curso de cada alumno, en memoria y compartida por todas las páginas de la pestaña: es la verdad
// mientras la pestaña viva (si localStorage falla, Hoy → Entrenar sigue andando) y se copia en localStorage en
// cada cambio para sobrevivir a una recarga.

const memory = new Map();
const listeners = new Set();
const uploads = new Map();

const notify = () => listeners.forEach((listener) => listener());

/** La sesión en curso del alumno, o null. La primera vez la lee de localStorage; después, siempre la misma referencia. */
export function readWorkout(studentId) {
  if (!memory.has(studentId)) memory.set(studentId, loadWorkout(studentId));
  return memory.get(studentId);
}

/** Reemplaza la sesión del alumno (null la borra), la copia en localStorage y avisa a quienes la miran. */
export function writeWorkout(studentId, workout) {
  memory.set(studentId, workout);
  if (workout) saveWorkout(studentId, workout);
  else clearWorkout(studentId);
  notify();
}

// Otra pestaña cambió una sesión (el evento llega solo a las demás): se adopta lo que dejó en localStorage.
function onStorage(event) {
  const ids = event.key === null ? [...memory.keys()] : [studentOfKey(event.key)];
  const known = ids.filter((id) => id !== null && memory.has(id));
  known.forEach((id) => memory.set(id, loadWorkout(id)));
  if (known.length > 0) notify();
}

/** Para `useSyncExternalStore`: escucha los cambios (y a las otras pestañas mientras haya alguien suscripto). */
export function subscribeWorkout(listener) {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** Una sola subida por alumno a la vez: mientras haya una en curso se devuelve esa misma promesa. */
export function trackUpload(studentId, run) {
  if (!uploads.has(studentId)) {
    const upload = Promise.resolve().then(run).finally(() => {
      if (uploads.get(studentId) === upload) uploads.delete(studentId);
    });
    uploads.set(studentId, upload);
  }
  return uploads.get(studentId);
}

/** Olvida lo que hay en memoria, como una recarga de la página (para los tests). */
export function resetWorkoutStore() {
  memory.clear();
  uploads.clear();
}
