import { useCallback, useRef } from 'react';

/**
 * Candado contra el doble envío. `isPending` de React Query llega recién en el render siguiente, así que un segundo
 * click o submit antes de ese render mandaría otro request. Esto marca un ref de forma sincrónica.
 *
 * Devuelve `lock(fn)`, estable entre renders: llama a `fn` en el acto (lo sincrónico, como `preventDefault`, corre en el
 * mismo evento) y devuelve una promesa con lo que resuelve; si ya hay una corrida en vuelo no la llama y resuelve
 * `undefined`. Se libera al terminar, bien o mal.
 */
export function useSubmitLock() {
  const busy = useRef(false);
  return useCallback(async (fn) => {
    if (busy.current) return undefined;
    busy.current = true;
    try {
      return await fn();
    } finally {
      busy.current = false;
    }
  }, []);
}
