import { useCallback, useEffect, useRef, useState } from 'react';

const UNEXPECTED = { status: null, code: 'UNEXPECTED', message: 'Error inesperado', retryable: true };

// Cómo termina una subida: guardada, con error, o sin nada para mostrar (se descartó la sesión o ya no hay una).
function settle(outcome) {
  if (outcome?.ok) return { status: 'saved', result: outcome, error: null };
  if (outcome && !outcome.cancelled) return { status: 'failed', result: null, error: outcome.error ?? UNEXPECTED };
  return { status: 'idle', result: null, error: null };
}

/**
 * La subida del entrenamiento terminado para la pantalla de la sesión. `upload` es el de `useActiveWorkout`.
 * - `status`: `idle`, `saving`, `saved` (con `result`: `{ state, failed, unlocked }`) o `failed` (con `error`, que trae
 *   `retryable` y el mensaje del servidor).
 * - `run()` sube (o reintenta); un segundo toque mientras guarda no hace nada.
 * - `resume` es para cuando la página se abre con la sesión ya lista para subir (se recargó entre Terminar y la
 *   subida, o se salió con un error): arranca en `saving` y sube sola, una sola vez.
 * El resultado queda en la página porque `upload()` borra la sesión en cuanto sale bien: lo que se muestra (el resumen)
 * ya no se puede leer de la sesión, y el `saving` evita que esa pantalla se tome por "no hay sesión".
 */
export function useWorkoutSave(upload, resume = false) {
  const [state, setState] = useState(() => ({ status: resume ? 'saving' : 'idle', result: null, error: null }));
  const mounted = useRef(false);
  const busy = useRef(false);
  const pendingResume = useRef(resume);

  const perform = useCallback(async () => {
    busy.current = true;
    let outcome;
    try {
      outcome = await upload();
    } catch (err) {
      outcome = { ok: false, error: { ...UNEXPECTED, message: err?.message || UNEXPECTED.message } };
    }
    busy.current = false;
    if (mounted.current) setState(settle(outcome));
  }, [upload]);

  const run = useCallback(() => {
    if (busy.current) return Promise.resolve();
    setState({ status: 'saving', result: null, error: null });
    return perform();
  }, [perform]);

  useEffect(() => {
    mounted.current = true;
    if (pendingResume.current) {
      pendingResume.current = false;
      perform();
    }
    return () => { mounted.current = false; };
  }, [perform]);

  return { ...state, run };
}
