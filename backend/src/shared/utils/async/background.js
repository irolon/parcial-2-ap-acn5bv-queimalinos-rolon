import { trackInFlight } from './in-flight.js';

/**
 * Corre `fn` sin que el llamador la espere: arranca en el próximo microtask y cualquier error
 * (sincrónico o de la promesa) se loguea y nunca llega a quien la lanzó.
 */
export function runInBackground(label, fn) {
  trackInFlight(
    Promise.resolve()
      .then(fn)
      .catch((err) => console.error(`[${label}]`, err?.message ?? err))
  );
}
