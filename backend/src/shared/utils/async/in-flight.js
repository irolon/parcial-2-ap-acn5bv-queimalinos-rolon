/**
 * Registro de las tareas que corren sin que nadie las espere (los avisos que se disparan
 * después de responder). En la app solo se anotan y se sueltan solas al terminar; la suite
 * de integración llama a `settleInFlight` antes de borrar sus datos, así ningún aviso tardío
 * inserta filas para un usuario que ya no existe.
 */
const pending = new Set();

/** Anota la promesa hasta que termine (bien o mal) y la devuelve sin tocarla. */
export function trackInFlight(promise) {
  pending.add(promise);
  const release = () => pending.delete(promise);
  promise.then(release, release);
  return promise;
}

/** Espera a todas las tareas en curso, incluidas las que se lancen mientras tanto. */
export async function settleInFlight() {
  while (pending.size > 0) await Promise.allSettled([...pending]);
}

/** Cantidad de tareas en curso (para tests). */
export const inFlightCount = () => pending.size;
