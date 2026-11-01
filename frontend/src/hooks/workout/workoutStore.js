import { useAuthStore } from '@/hooks/auth/useAuthStore';
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

// Se escucha desde que se carga el módulo y no se deja nunca: si solo se escuchara con alguien suscripto, mientras el
// alumno está en una página sin el hook la memoria quedaría vieja y la próxima acción pisaría lo de la otra pestaña.
if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

/** Para `useSyncExternalStore`: avisa cada vez que cambia alguna sesión (en esta pestaña o en otra). */
export function subscribeWorkout(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Una sola subida a la vez por `key` (`${studentId}:${workout.id}`): mientras haya una en curso se devuelve esa misma
 * promesa. Con la sesión en la clave, una sesión nueva no espera a la subida de una descartada.
 * `run(signal)` recibe un `AbortSignal` que se dispara con `cancelUploads()`.
 */
export function trackUpload(key, run) {
  if (!uploads.has(key)) {
    const controller = new AbortController();
    const promise = Promise.resolve().then(() => run(controller.signal)).finally(() => {
      if (uploads.get(key)?.promise === promise) uploads.delete(key);
    });
    uploads.set(key, { promise, controller });
  }
  return uploads.get(key).promise;
}

/** Corta los pedidos en vuelo de todas las subidas y las olvida (lo que el servidor ya confirmó queda guardado). */
export function cancelUploads() {
  uploads.forEach(({ controller }) => controller.abort());
  uploads.clear();
}

// Si cambia quién inició sesión (cerró sesión, entró otra cuenta o venció la sesión), lo que falta de una subida
// saldría con el token de otra cuenta: se corta. La sesión queda en ft.workout.<id> y se retoma cuando ese alumno vuelva.
useAuthStore.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) cancelUploads();
});

/** Olvida lo que hay en memoria, como una recarga de la página (para los tests). */
export function resetWorkoutStore() {
  memory.clear();
  cancelUploads();
}
